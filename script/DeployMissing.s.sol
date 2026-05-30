// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

contract DeployMissing is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the 5 missing contracts with correct constructor args
        address aicoin = 0xcb0402629AF93ac8205736c771ACB5e842357f66;
        address companyRegistry = 0x22386a826027f8522A19E17282471752FA3F8a9b;
        address modelRegistry = 0x45bfc1A9ED3ABeeCC5931637b557928450a6c2ba;
        address treasury = 0x242c7E26De8c7feF7Ecc1a26F50c99904c824Ae3;
        address validatorPool = 0x302CD5e6599Db4CCE74011dfb8B13aaCA2Be8608;
        address halvingController = 0xcC58c23a8c51888316205a5a5e2424a521f8e724;
        
        // MiningReserve
        address miningReserve = deployCode("MiningReserve.sol:MiningReserve", abi.encode(aicoin, validatorPool, halvingController));
        console.log("MiningReserve:", miningReserve);
        
        // GasRelayerFund
        address gasRelayerFund = deployCode("GasRelayerFund.sol:GasRelayerFund", abi.encode(aicoin));
        console.log("GasRelayerFund:", gasRelayerFund);
        
        // Verifier
        address verifier = deployCode("Verifier.sol:Verifier", abi.encode(aicoin));
        console.log("Verifier:", verifier);
        
        // PaymentRouter
        address paymentRouter = deployCode("PaymentRouter.sol:PaymentRouter", abi.encode(treasury, validatorPool, gasRelayerFund, companyRegistry, modelRegistry, aicoin));
        console.log("PaymentRouter:", paymentRouter);
        
        // AgentWallet
        address agentWallet = deployCode("AgentWallet.sol:AgentWallet", abi.encode(aicoin, paymentRouter, companyRegistry));
        console.log("AgentWallet:", agentWallet);
        
        vm.stopBroadcast();
        console.log("All 5 missing contracts deployed!");
    }
}
