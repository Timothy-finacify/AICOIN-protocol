// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/AICOIN.sol";
import "../src/PaymentRouter.sol";
import "../src/Treasury.sol";
import "../src/CompanyRegistry.sol";
import "../src/HalvingController.sol";
import "../src/Verifier.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        HalvingController halving = new HalvingController();
        Treasury treasury = new Treasury(address(halving));
        AICOIN token = new AICOIN();
        CompanyRegistry registry = new CompanyRegistry();
        Verifier verifier = new Verifier();
         PaymentRouter router = new PaymentRouter(address(treasury), 0x1279759F4716e8A3dCe2C18f6E2B9DE58f2A1998, address(token));
        
        vm.stopBroadcast();
        
        console.log("HalvingController:", address(halving));
        console.log("Treasury:", address(treasury));
        console.log("AICOIN:", address(token));
        console.log("CompanyRegistry:", address(registry));
        console.log("Verifier:", address(verifier));
        console.log("PaymentRouter:", address(router));
    }
}