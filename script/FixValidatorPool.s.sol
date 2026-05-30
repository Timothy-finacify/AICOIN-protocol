// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Script.sol";
contract FixValidatorPool is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        address vp = deployCode("ValidatorPool.sol:ValidatorPool", abi.encode(0xcb0402629AF93ac8205736c771ACB5e842357f66, 0xcC58c23a8c51888316205a5a5e2424a521f8e724));
        console.log("New ValidatorPool:", vp);
        vm.stopBroadcast();
    }
}
