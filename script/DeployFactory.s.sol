// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Script.sol";
import "../contracts/HalvingController.sol";
import "../contracts/ValidatorPool.sol";

contract Factory {
    address public validatorPool;
    address public halvingController;
    
    constructor(address aicoin) {
        halvingController = address(new HalvingController(aicoin, address(this)));
        validatorPool = address(new ValidatorPool(aicoin, halvingController));
    }
}

contract DeployFactory is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        Factory f = new Factory(0xcb0402629AF93ac8205736c771ACB5e842357f66);
        console.log("ValidatorPool:", f.validatorPool());
        console.log("HalvingController:", f.halvingController());
        vm.stopBroadcast();
    }
}
