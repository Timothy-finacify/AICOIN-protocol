// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/TokenVerifier.sol";

contract DeployTokenVerifier is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        TokenVerifier verifier = new TokenVerifier(0x88227791E59F5773E201210Bada58Cf42692A120);
        vm.stopBroadcast();
        console.log("TokenVerifier:", address(verifier));
    }
}