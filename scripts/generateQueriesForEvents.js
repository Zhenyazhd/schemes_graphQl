const fs = require("fs");
const path = require("path");

function parseGraphQLSchema(filePath) {
    const schema = fs.readFileSync(filePath, "utf-8");


    const queryBlock = schema.match(/type Query {([\s\S]*?)}/);
    const eventsResponseBlock = schema.match(/type EventsResponse {([\s\S]*?)}/);

    if (!queryBlock) {
        console.error("Query type not found.");
        return [];
    }

    let eventTypes = {};
    let eventFields = [];
    if (eventsResponseBlock) {
        eventFields = eventsResponseBlock[1]
            .split("\n")
            .map(line => line.trim().split(":")[0].trim())
            .filter(name => name && name !== ""); 


        eventFields.forEach(event => {
            const regex = new RegExp(`type ${event} {([\\s\\S]*?)}`, "g");
            const match = regex.exec(schema);
            if (match) {
                eventTypes[event] = match[1]
                    .split("\n")
                    .map(line => line.trim().split(":")[0])
                    .filter(field => field);

                console.log(eventTypes[event]);
            }
        });

    } else {
        console.error("EventsResponse type not found.");
    }

    return queryBlock[1]
        .split("\n")
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("#"))
        .map(field => {

            const regex = /^(\w+)\(([^)]*)\)?:\s*([\w!\[\]]+)/;
            const match = field.match(regex);

            if (match) {
                const queryName = match[1];
                const args = match[2]
                    .split(",")
                    .map(arg => arg.split(":")[0].trim())
                    .filter(arg => arg);

                let returnType = match[3].replace("!", "").replace(/\[|\]/g, ""); 
                const argsString = args.length ? args.map(arg => `${arg}: "${arg}_value"`).join(", ") : "";

                if (returnType === "EventsResponse") {
                    const eventsString = eventFields
                        .map(event => `    ${event} { ${eventTypes[event].join(" ")} }`)
                        .join("\n");

                    return `query { ${queryName}(${argsString}) {\n${eventsString}\n  } }`;
                }

                return `query { ${queryName}(${argsString}) }`;
            } else {
                const queryName = field.split(":")[0].trim();
                return `query { ${queryName} }`;
            }
        }
    );
}

const schemaPath = path.join(__dirname, "../generated/schema.graphql");
const queries = parseGraphQLSchema(schemaPath);

const outputFilePath = path.join(__dirname, "queries.graphql");
fs.writeFileSync(outputFilePath, queries.join("\n\n"), "utf8");

console.log("Queries in:", outputFilePath);
