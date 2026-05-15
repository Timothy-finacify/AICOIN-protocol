// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentWallet.sol";

contract DeployAgentWallet is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        AgentWallet agentWallet = new AgentWallet(0xB52612f12117713437639E713801844B4bAFb60c);
        
        vm.stopBroadcast();
        
        console.log("AgentWallet:", address(agentWallet));
    }
} 