// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Script.sol";
contract FinalHC is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        address aicoin = 0xcb0402629AF93ac8205736c771ACB5e842357f66;
        address vp = 0x50ed2431403CF8912Ab2ed04041B5BE0E85006C4;
        address hc = deployCode("HalvingController.sol:HalvingController", abi.encode(aicoin, vp));
        console.log("Final HalvingController:", hc);
        vm.stopBroadcast();
    }
}
