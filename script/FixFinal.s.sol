// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Script.sol";
contract FixFinal is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        address aicoin = 0xcb0402629AF93ac8205736c771ACB5e842357f66;
        address vp = 0xB072b429412dcAD2cE406ff47073e7912b0765d7;
        address hc = deployCode("HalvingController.sol:HalvingController", abi.encode(aicoin, vp));
        console.log("HalvingController:", hc);
        vm.stopBroadcast();
    }
}
