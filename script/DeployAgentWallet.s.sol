// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentWallet.sol";

contract DeployAgentWallet is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        AgentWallet agentWallet = new AgentWallet(0x0Faa0694EadFEa9c9A64F7dAaaDa99f9c935C00E);
        vm.stopBroadcast();
        console.log("AgentWallet:", address(agentWallet));
    }
}