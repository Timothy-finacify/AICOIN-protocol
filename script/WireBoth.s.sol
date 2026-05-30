// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Script.sol";
contract WireBoth is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        address aicoin = 0xcb0402629AF93ac8205736c771ACB5e842357f66;
        address hc = deployCode("HalvingController.sol:HalvingController", abi.encode(aicoin, msg.sender));
        address vp = deployCode("ValidatorPool.sol:ValidatorPool", abi.encode(aicoin, hc));
        console.log("HalvingController:", hc);
        console.log("ValidatorPool:", vp);
        vm.stopBroadcast();
    }
}
