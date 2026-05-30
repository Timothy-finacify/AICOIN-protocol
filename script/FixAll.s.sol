// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Script.sol";
contract FixAll is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        address aicoin = 0xcb0402629AF93ac8205736c771ACB5e842357f66;
        address vp = deployCode("ValidatorPool.sol:ValidatorPool", abi.encode(aicoin, 0x13D977FE44c84A3Ce550DE646E77F2dA771768D5));
        console.log("ValidatorPool:", vp);
        vm.stopBroadcast();
    }
}
