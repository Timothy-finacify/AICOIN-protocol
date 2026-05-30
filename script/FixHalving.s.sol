// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Script.sol";
contract FixHalving is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        address hc = deployCode("HalvingController.sol:HalvingController", abi.encode(0xcb0402629AF93ac8205736c771ACB5e842357f66, 0x597116DA6C80B34eAEe9D7c92969222Be382C75E));
        console.log("New HalvingController:", hc);
        vm.stopBroadcast();
    }
}
