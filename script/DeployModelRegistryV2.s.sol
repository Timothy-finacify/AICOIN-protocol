// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/ModelRegistry.sol";

contract DeployModelRegistryV2 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        ModelRegistry registry = new ModelRegistry(0xba2288c981A003D1669b9A039a8eFA7E9A0dFaBf);
        vm.stopBroadcast();
        console.log("ModelRegistry V2:", address(registry));
    }
} 