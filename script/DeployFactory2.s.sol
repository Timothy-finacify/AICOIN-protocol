// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Script.sol";
import "../contracts/HalvingController.sol";
import "../contracts/ValidatorPool.sol";

contract Factory2 {
    address public validatorPool;
    address public halvingController;
    
    constructor(address aicoin) {
        // Deploy ValidatorPool first with a temp halving controller
        validatorPool = address(new ValidatorPool(aicoin, address(0)));
        // Now deploy HalvingController with the real ValidatorPool
        halvingController = address(new HalvingController(aicoin, validatorPool));
    }
}

contract DeployFactory2 is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        Factory2 f = new Factory2(0xcb0402629AF93ac8205736c771ACB5e842357f66);
        console.log("ValidatorPool:", f.validatorPool());
        console.log("HalvingController:", f.halvingController());
        vm.stopBroadcast();
    }
}
