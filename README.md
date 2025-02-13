# Schema Generator

## Overview

Made this script to understand how to generate GraphQL schemas from Ethereum smart contract ABIs.

The repository provides a script to generate GraphQL schemas from Ethereum smart contract ABIs. The script automates the creation of GraphQL types, queries, mutations, and event types, making it easier to integrate smart contracts with a GraphQL API.

## Features
- Extracts function signatures and event definitions from smart contract ABIs.
- Automatically generates GraphQL types, inputs, and outputs.
- Supports mapping Solidity types to GraphQL types.
- Includes event logging and retrieval functionality.
- Generates a separate schema file for each contract.

## Installation
Ensure you have Node.js installed, then clone this repository and install dependencies:

```sh
npm install
```

## Usage
To generate GraphQL schemas, run:

```sh
npm run generate:schemes
```

## File Structure
```
|-- generated/
|   |-- schema_<ContractName>.graphql  # Generated GraphQL schemas
|-- output/
|   |-- out/<ContractName>.sol/<ContractName>.json  # Contract ABIs
|   |-- deployed.json  # Contracts addresses
|-- scripts/
|   |-- generateSchemes.js  # Main script for schema generation
|   |-- fetchEvents.js  # Event retrieval script
```

## Mapping Solidity Types to GraphQL
Solidity types are mapped to GraphQL types using the following dictionary:

```js
const mapping = {
    "uint256": "String",
    "uint8": "Int",
    "address": "String",
    "bytes32": "String",
    "bool": "Boolean",
    "string": "String",
    "bytes": "String"
};
```

### Handling Structs
The script extracts structs from smart contract ABIs and generates corresponding GraphQL input and output types.

Example:
```graphql
type MyStructOutput {
  id: String!
  value: Int!
}

input MyStructInput {
  id: String!
  value: Int!
}
```

### Generating Events Schema
Events from smart contracts are extracted and converted into GraphQL types:
```graphql
type EventsResponse {
  EventName: [EventName!]!
}

type EventName {
  hash: ID!
  blockNumber: Int!
  transactionHash: String!
}
```

## License
This project is open-source and available under the MIT License.

