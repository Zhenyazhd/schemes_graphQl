const fs = require("fs");
const path = require("path");

const mapping = {
    "uint256": "String",
    "uint8": "Int",
    "address": "String",
    "bytes32": "String",
    "bool": "Boolean",
    "string": "String",
    "bytes": "String"
};


function extractStructsFromABI(abi) {
    const structs = {};

    function addStruct(source) {
        if (source.type.startsWith("tuple")) {
            const structName = source.internalType.split(" ")[1].split(".")[1].replace("[]", ""); 
            if(!mapping[structName]){
                structs[structName] = source.components.map(field => ({
                    name: field.name,
                    type: mapSolidityToGraphQL(field.type, field.internalType)
                }));
                mapping[structName] = {input: `${structName}Input`, output:`${structName}Output`}; 
            }
        }
    }
    
    abi.forEach(item => {
        if (item.type === "function") {
            item.inputs.forEach(input => {
                addStruct(input)
            });
            item.outputs.forEach(output => {
                addStruct(output);    
            });
            if(item.outputs.length > 1){
                const functionName = item.name;
                const returnTypeName = functionName.charAt(0).toUpperCase() + functionName.slice(1);
                if(!mapping[`${returnTypeName}Output`]){
                    structs[returnTypeName ] =  item.outputs.map(field => ({
                        name: field.name,
                        type: mapSolidityToGraphQL(field.type, field.internalType)
                    }));
                    mapping[`${returnTypeName}Output`] = `${returnTypeName}Output`; 

                }
            }  
        }
    });

    return structs;
}


function mapSolidityToGraphQL(type, internal='', isInput=false) {

    function mapSolidityArrayToGraphQL(type, isInput=false) {
        let count = 0;
        while (type.endsWith("[]")) {
            count++;
            type = type.slice(0, -2);
        }
    
        let mappedType = mapSolidityToGraphQL(type, '',isInput);
        for (let i = 0; i < count; i++) {
            mappedType = `[${mappedType}!]`;
        }
        return mappedType;
    }

    if (mapping[type]) {  
        if (typeof mapping[type] === 'object') {          
            return mapping[type][isInput ? 'input' : 'output'];
        }
        return mapping[type]; 
    }
    
    if (type.startsWith("tuple")) {
        type = (internal.replace("struct ", "")).split(".")[1];
        if (!type.endsWith("[]")) { 
            return mapping[type][isInput ? 'input' : 'output'];
        }
    }

    if (type.endsWith("[]")) {  
        return mapSolidityArrayToGraphQL(type, isInput);
    }

    return "String"; 
}


function generateGraphQLSchemaStructs(structs) {
    let schema = "";
    Object.entries(structs).forEach(([structName, fields]) => {
        ['input', 'type'].forEach(type => {
            schema += `${type} ${structName}${type === 'input' ? 'Input' : 'Output'} {\n`;
            fields.forEach(field => schema += `  ${field.name}: ${field.type}\n`);
            schema += `}\n\n`;
        });
    });

    return schema;
}


function generateEventSchema(abi) {
    let typeDefs_events = `type EventsResponse {\n`;
    let typeDefs = ``;

    abi.forEach((item) => {
        if (item.type === "event") {
            const eventName = item.name;
            const fields = item.inputs
                .map(input => `  ${input.name}: ${mapSolidityToGraphQL(input.type, input.internalType)}`)
                .join("\n");

            typeDefs_events += `  ${eventName}: [${eventName}!]!\n`;

            typeDefs += `type ${eventName} {\n  hash: ID!\n${fields}\n  blockNumber: Int!\n  transactionHash: String!\n}\n\n`;
        }
    });

    typeDefs_events += `}\n\n`;

    return {typeDefs_events, typeDefs };
}


function generateGraphQLSchema(abi) {
    let typeDefs = `type Query {\n`;

    abi.forEach((item) => {
        if (item.type === "function" && (item.stateMutability === "view" || item.stateMutability === "pure")) {
            const functionName = item.name;
            const inputs = item.inputs.map(input => `${input.name === "" ? 'create_name': input.name}: ${mapSolidityToGraphQL(input.type, input.internalType, true)}`).join(", ");
        
            let returnType = "";
            if(item.outputs.length < 1){
                returnType = "Boolean";
            } else if(item.outputs.length == 1){
                returnType = mapSolidityToGraphQL(item.outputs[0].type, item.outputs[0].internalType);
            } else {
                returnType = mapSolidityToGraphQL(functionName.charAt(0).toUpperCase() + functionName.slice(1) + "Output");
            }

            if(inputs && inputs !== ""){
                typeDefs += `  ${functionName}(${inputs}): ${returnType}\n`;
            } else {
                typeDefs += `  ${functionName}: ${returnType}\n`;
            }
        }
    });

    typeDefs += ` getAllEvents(fromBlock: Int, toBlock: Int): EventsResponse!\n  getEventsByTxHash(txHash: String): EventsResponse!\n}\n\n`;
    typeDefs += ` type Mutation {\n`;

    abi.forEach((item) => {
        if (item.type === "function" && !(item.stateMutability === "view" || item.stateMutability === "pure")) {
            const functionName = item.name;
            const inputs = item.inputs.map(input => `${input.name === "" ? 'create_name': input.name}: ${mapSolidityToGraphQL(input.type, input.internalType, true)}`).join(", ");
            if(inputs && inputs !== ""){
                typeDefs += `  ${functionName}(${inputs}): Boolean\n`;
            } else {
                typeDefs += `  ${functionName}: Boolean\n`;
            }
        }
    });

    typeDefs += `}\n\n`;

    return typeDefs;
}



function generateStructs() {
    const names = [/* ... */];

    for (const name of names) {

        const outputDir = "./generated";
        const pathSchema = `${outputDir}/schema_${name}.graphql`;
        const abiPath = path.join(__dirname, `../output/out/${name}.sol/${name}.json`);
        const abi = JSON.parse(fs.readFileSync(abiPath, "utf-8")).abi;    

        const {typeDefs_events, typeDefs} = generateEventSchema(abi);
        const structs = extractStructsFromABI(abi);
        const graphqlSchema = generateGraphQLSchemaStructs(structs);
        const schemaString = generateGraphQLSchema(abi);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        fs.writeFileSync(pathSchema, `${schemaString}`, "utf8");
        fs.appendFileSync(pathSchema, `${typeDefs_events}`, "utf8");
        fs.appendFileSync(pathSchema, `${typeDefs}`, "utf8");
        fs.appendFileSync(pathSchema, `${graphqlSchema}`, "utf8");

        console.log("GraphQL Schema generated successfully");
    }

}

generateStructs();
