const { parse } = require("graphql");
const path = require("path");
const fs = require("fs");

function loadSchema(contractName) {
    const schemaPath = path.join(__dirname, `../generated/schema_${contractName}.graphql`);
    if (!fs.existsSync(schemaPath)) {
        console.error(`Schema file not found: ${schemaPath}`);
        return null;
    }

    try {
        const schema = fs.readFileSync(schemaPath, "utf8");
        return parse(schema);
    } catch (error) {
        console.error(`rror parsing schema:`, error);
        return null;
    }
}

function extractEventNames(schema) {
    if (!schema) return [];

    return schema.definitions
        .filter(def => def.kind === "ObjectTypeDefinition")
        .map(def => def.name.value)
        .filter(name => name !== "Query" && name !== "Mutation" && name !== "EventsResponse");
}

function getEvents(contract, name, logs) {
    const schema = loadSchema(name);
    if (!schema) return {};

    const eventNames = extractEventNames(schema);


    let parsedEvents = logs.map(log => {
        try {
            const parsedLog = contract.interface.parseLog(log);

            let argsObject = {};
            parsedLog.fragment.inputs.forEach((input, index) => {
                argsObject[input.name || `arg${index}`] = parsedLog.args[index];
            });

            return {
                event: parsedLog.name,
                args: argsObject,
                transactionHash: log.transactionHash,
                blockNumber: log.blockNumber
            };
        } catch (error) {
            console.error(`Error parsing log:`, error);
            return null;
        }
    }).filter(event => event !== null);

    let eventsResponse = {};
    eventNames.forEach(eventName => {

        eventsResponse[eventName] = parsedEvents
            .filter(e => e.event === eventName)
            .map(e => {
                let result = {
                    hash: e.transactionHash,
                    blockNumber: e.blockNumber,
                    transactionHash: e.transactionHash
                };
                Object.keys(e.args).forEach(arg => {
                    if (isNaN(arg)) {
                        result[arg] = e.args[arg];
                    }
                });
                return result;
            });
    });

    return eventsResponse;
}

module.exports = {
    getEvents
};