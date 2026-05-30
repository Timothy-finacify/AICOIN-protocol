// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Script.sol";
contract DeployPR is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        address pr = deployCode("PaymentRouter.sol:PaymentRouter", abi.encode(0x242c7E26De8c7feF7Ecc1a26F50c99904c824Ae3, 0x0032e83417F778994ECc850fB1Df3886A96E31c4, 0xFfC873D25F38CBFE68bFb74b34228A6a6B98d5DC, 0x22386a826027f8522A19E17282471752FA3F8a9b, 0x021aa2761aD177b97e311775d219615F2A4aC3cc, 0xcb0402629AF93ac8205736c771ACB5e842357f66));
        console.log("PaymentRouter:", pr);
        vm.stopBroadcast();
    }
}
