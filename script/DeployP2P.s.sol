// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Script.sol";
contract DeployP2P is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        address pe = deployCode("P2PEscrow.sol:P2PEscrow", abi.encode(0xcb0402629AF93ac8205736c771ACB5e842357f66, 0x7D8340CfD776a403E42260E75efe92E7FB5E3b58));
        console.log("P2PEscrow:", pe);
        vm.stopBroadcast();
    }
}