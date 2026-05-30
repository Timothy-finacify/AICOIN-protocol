// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Script.sol";

contract DeployPair is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = 0x7A92Ed305671429597FCe407a010a6868283e577;
        vm.startBroadcast(pk);
        
        address aicoin = 0xcb0402629AF93ac8205736c771ACB5e842357f66;
        
        // Deploy HalvingController with deployer as temp validator pool
        address hc = deployCode("HalvingController.sol:HalvingController", abi.encode(aicoin, deployer));
        
        // Deploy ValidatorPool pointing to the real HalvingController
        address vp = deployCode("ValidatorPool.sol:ValidatorPool", abi.encode(aicoin, hc));
        
        console.log("HalvingController:", hc);
        console.log("ValidatorPool:", vp);
        vm.stopBroadcast();
    }
}
