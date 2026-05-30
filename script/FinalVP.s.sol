// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Script.sol";
contract FinalVP is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        address aicoin = 0xcb0402629AF93ac8205736c771ACB5e842357f66;
        address hc = 0x7b394aDf613Fd661E363a333a3395C5796125FC1;
        address vp = deployCode("ValidatorPool.sol:ValidatorPool", abi.encode(aicoin, hc));
        console.log("Final ValidatorPool:", vp);
        vm.stopBroadcast();
    }
}
