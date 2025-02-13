
const fs = require("fs");
const path = require("path");
const { getEvents } = require("./fetchEvents");
const { ethers } = require("ethers");
require("dotenv").config();


const provider = new ethers.JsonRpcProvider(process.env.WEB3_PROVIDER_URL);
const deployedContracts = require("../output/deployed.json");
const contractName = '';
const abiPath = path.join(__dirname, `../../output/out/${contractName}.sol/${contractName}.json`);
const abi = JSON.parse(fs.readFileSync(abiPath, "utf-8")).abi;
const contractAddress = deployedContracts[`${contractName}`];
const contract = new ethers.Contract(contractAddress, abi, provider);

const resolversVC = {
    Query: {
        // ...
    },
    Mutation: {
        // ...
    }
};




module.exports = resolversVC;