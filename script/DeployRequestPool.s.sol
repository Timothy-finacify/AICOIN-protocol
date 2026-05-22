// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/RequestPool.sol";

contract DeployRequestPool is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        RequestPool pool = new RequestPool();
        vm.stopBroadcast();
        console.log("RequestPool:", address(pool));
    }
} 