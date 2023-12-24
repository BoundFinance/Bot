require('dotenv').config();
const fs = require('fs');

const { contractABI } = require("./abi.js");
const { contractABIemissions } = require("./abiemissions.js");
const cron = require('node-cron');
const { Web3 } = require('web3');



// Initialize web3 with a provider
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.GORELI_KEY));

// Your setup
const senderAddress = '0x61e3d34165557C7c76F5485Fc4ad068f0F53E0B9';
const privateKey = process.env.PRIVATE_KEY;
const contractAddress = '0xd9823557f1f8992d4764Eb77eCe34cCac8aC824c';
const emissionsContractAddress = '0x14f3eE6Ce80ff35D643a24F2D5D08F5DE89EC1D9'; // Replace with your staking contract address
const contract = new web3.eth.Contract(contractABI, contractAddress);
const stakingContract = new web3.eth.Contract(contractABIemissions, emissionsContractAddress);

const ControlContractAddress = '0xD1ef98984233294b620cf6EE9D4Fd59f8227029B';
const {contractABIControl} = require('./abicontrolpanel.js');
 const ControlContract = new web3.eth.Contract(contractABIControl, ControlContractAddress);


async function mainLoop() {
    try {

        const logs = await contract.getPastEvents('Deposited', {
            fromBlock: 0,
            toBlock: 'latest'
        });

        web3.eth.getBalance(senderAddress).then(balance => {
            console.log(`Balance on Goerli: ${web3.utils.fromWei(balance, 'ether')} ETH`);
        }).catch(error => {
            console.error("Error connecting to Goerli:", error);
        });
        

        console.log("=== Processing Deposited Events ===");

        for (let log of logs) {

                const userAddress = log.returnValues.user;
                console.log("This is the user =", userAddress);
    
                const meetsRequirement = await stakingContract.methods.meetsStakingRequirement(userAddress).call({from: senderAddress});
                console.log("Does this user fulfill the requirements", meetsRequirement);
                await new Promise(resolve => setTimeout(resolve, 0));
                if (userAddress !== senderAddress) {
                    if(!meetsRequirement) {
                    const withdrawableInterest = await stakingContract.methods.withdrawableInterestOf(userAddress).call();
                    const interestString = withdrawableInterest.toString();
                    console.log(interestString, "this is the user withdrawable interest");
                    await new Promise(resolve => setTimeout(resolve, 0));
                    if (web3.utils.fromWei(Number(interestString), 'ether') > 0) {
                        await buyOutNonMaintainedShares(userAddress);
                        // Wait for 15 seconds before proceeding to the next iteration
                        await new Promise(resolve => setTimeout(resolve, 0));
                        }
                    }
            }
        } 
    
        console.log("=== Processing Completed ===");

    } catch (error) {
        console.error(error);
    }
}

async function buyOutNonMaintainedShares(userAddress) {
    try {

        const gasPrice = await web3.eth.getGasPrice();

        const txData = {
            from: senderAddress,
            to: emissionsContractAddress,
            data: stakingContract.methods.buyOutNonMaintainedShares(userAddress).encodeABI(),
            gas: 300000, // Set an appropriate gas limit
            gasPrice: gasPrice,
        };

        const signedTx = await web3.eth.accounts.signTransaction(txData, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log(`Transaction hash: ${receipt.transactionHash}`);
        console.log(`Processed buyout for: ${userAddress}`);
    } catch (error) {
        console.error("Error in buyOutNonMaintainedShares function:", error);
    }
}


async function callContractFunctions() {
    // Example of calling a contract function
    try {
        await interestBCKSavingsAccount();
        await interestEmissions();
        await interestStablecointoBCK();
    } catch (error) {
        console.error("Error in contract function calls:", error);
    }
}

async function interestBCKSavingsAccount() {
    const gasPrice = await web3.eth.getGasPrice();

    try {
        const randomAmount = web3.utils.toWei((Math.floor(Math.random() * (70 - 40 + 1)) + 40).toString(), 'ether');

        const txData = {
            from: senderAddress,
            to: ControlContractAddress,
            data: ControlContract.methods.interestBCKSavingsAccount(randomAmount).encodeABI(),
            gas: 300000,
            gasPrice: gasPrice // Set an appropriate gas limit
        };

        const signedTx = await web3.eth.accounts.signTransaction(txData, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log(`BCK Savings Account interest transaction hash: ${receipt.transactionHash}`);
    } catch (error) {
        console.error("Error in interestBCKSavingsAccount function:", error);
    }
}


async function interestEmissions() {
    const gasPrice = await web3.eth.getGasPrice();

    try {
        const txData = {
            from: senderAddress,
            to: ControlContractAddress,
            data: ControlContract.methods.interestEmissions().encodeABI(),
            gas: 300000,
            gasPrice: gasPrice, // Set an appropriate gas limit
        };

        const signedTx = await web3.eth.accounts.signTransaction(txData, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log(`Emissions interest transaction hash: ${receipt.transactionHash}`);
    } catch (error) {
        console.error("Error in interestEmissions function:", error);
    }
}


async function interestStablecointoBCK() {
    const gasPrice = await web3.eth.getGasPrice();

    try {
        const txData = {
            from: senderAddress,
            to: ControlContractAddress,
            data: ControlContract.methods.interestStablecointoBCK().encodeABI(),
            gas: 300000,
            gasPrice: gasPrice// Set an appropriate gas limit
        };

        const signedTx = await web3.eth.accounts.signTransaction(txData, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log(`Stablecoin to BCK interest transaction hash: ${receipt.transactionHash}`);
    } catch (error) {
        console.error("Error in interestStablecointoBCK function:", error);
    }
}


function main() {
    // Run the main loop immediately once, then schedule it for every 4 hours
    mainLoop();
    setInterval(mainLoop, 4 * 60 * 60 * 1000); // 4 hours in milliseconds

    // Define the cron schedules
    const cronSchedules = ['0 22 * * *'];

    // Select a random schedule
    const selectedSchedule = cronSchedules[Math.floor(Math.random() * cronSchedules.length)];
         

    // Set up your cron job as before
    cron.schedule(selectedSchedule, async function() {
        console.log("Running scheduled task at: " + new Date().toISOString());
        console.log("=== Calling Contract Functions ===");
        try {
            await callContractFunctions();
            console.log("=== Contract Functions Called ===");
        } catch (error) {
            console.error("Error during contract function calls:", error);
        }
    });
    
}

main() 