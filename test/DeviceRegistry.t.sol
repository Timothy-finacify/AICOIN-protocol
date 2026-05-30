// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/DeviceRegistry.sol";

contract DeviceRegistryTest is Test {
    DeviceRegistry public registry;
    address public user = address(10);
    bytes32 public deviceId = keccak256("test-device");
    
    function setUp() public {
        registry = new DeviceRegistry();
    }
    
    function testRegisterDevice() public {
        vm.prank(user);
        registry.registerDevice(deviceId);
        assertTrue(registry.isDeviceRecognized(deviceId));
    }
    
    function testCannotDoubleRegister() public {
        vm.startPrank(user);
        registry.registerDevice(deviceId);
        vm.expectRevert();
        registry.registerDevice(deviceId);
        vm.stopPrank();
    }
    
    function testSendToLostPool() public {
        vm.prank(user);
        registry.registerDevice(deviceId);
        registry.sendToLostPool(deviceId, "malicious");
        assertTrue(registry.isDeviceBanned(deviceId));
    }
}