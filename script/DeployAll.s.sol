// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

contract DeployAll is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deployer:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy contracts in order using bytecode
        address aicoin = deployCode("AICOIN.sol:AICOIN", "");
        console.log("AICOIN:", aicoin);
        
        address deviceRegistry = deployCode("DeviceRegistry.sol:DeviceRegistry", "");
        console.log("DeviceRegistry:", deviceRegistry);
        
        address companyRegistry = deployCode("CompanyRegistry.sol:CompanyRegistry", abi.encode(aicoin));
        console.log("CompanyRegistry:", companyRegistry);
        
        address modelRegistry = deployCode("ModelRegistry.sol:ModelRegistry", abi.encode(aicoin, companyRegistry, deployer));
        console.log("ModelRegistry:", modelRegistry);
        
        address treasury = deployCode("Treasury.sol:Treasury", abi.encode(aicoin, deployer));
        console.log("Treasury:", treasury);
        
        address validatorPool = deployCode("ValidatorPool.sol:ValidatorPool", abi.encode(aicoin, deployer));
        console.log("ValidatorPool:", validatorPool);
        
        address halvingController = deployCode("HalvingController.sol:HalvingController", abi.encode(aicoin, validatorPool));
        console.log("HalvingController:", halvingController);
        
        address miningReserve = deployCode("MiningReserve.sol:MiningReserve", abi.encode(aicoin, validatorPool, halvingController));
        console.log("MiningReserve:", miningReserve);
        
        address gasRelayerFund = deployCode("GasRelayerFund.sol:GasRelayerFund", abi.encode(aicoin));
        console.log("GasRelayerFund:", gasRelayerFund);
        
        address verifier = deployCode("Verifier.sol:Verifier", abi.encode(aicoin));
        console.log("Verifier:", verifier);
        
        address tokenVerifier = deployCode("TokenVerifier.sol:TokenVerifier", abi.encode(aicoin));
        console.log("TokenVerifier:", tokenVerifier);
        
        address paymentRouter = deployCode("PaymentRouter.sol:PaymentRouter", abi.encode(treasury, validatorPool, gasRelayerFund, companyRegistry, modelRegistry, aicoin));
        console.log("PaymentRouter:", paymentRouter);
        
        address session = deployCode("Session.sol:Session", abi.encode(paymentRouter));
        console.log("Session:", session);
        
        address agentWallet = deployCode("AgentWallet.sol:AgentWallet", abi.encode(aicoin, paymentRouter, companyRegistry));
        console.log("AgentWallet:", agentWallet);
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("All 14 contracts deployed!");
    }
}