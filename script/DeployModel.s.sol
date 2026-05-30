// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Script.sol";
contract DeployModel is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        address mr = deployCode("ModelRegistry.sol:ModelRegistry", abi.encode(0xcb0402629AF93ac8205736c771ACB5e842357f66, 0x22386a826027f8522A19E17282471752FA3F8a9b, 0x7A92Ed305671429597FCe407a010a6868283e577));
        console.log("ModelRegistry:", mr);
        vm.stopBroadcast();
    }
}
