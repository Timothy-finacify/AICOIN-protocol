// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract DeviceRegistry is Ownable2Step {
    
    struct Device {
        bytes32 deviceId;
        address owner;
        uint256 registeredAt;
        uint256 lastActiveAt;
        uint256 totalRequests;
        bool active;
    }
    
    mapping(bytes32 => Device) public devices;
    mapping(address => bytes32[]) public userDevices;
    mapping(bytes32 => uint256) public lostPoolIndex;
    
    bytes32[] public lostPool;
    uint256 public constant LOST_POOL_SIZE = 2**64; // Practical limit, represents the 2^625 concept
    uint256 public lostPoolCount;
    
    string public constant VERSION = "1.0.0";
    
    event DeviceRegistered(bytes32 indexed deviceId, address indexed owner);
    event DeviceDeactivated(bytes32 indexed deviceId);
    event DeviceLostToPool(bytes32 indexed deviceId, uint256 poolIndex, string reason);
    event DeviceActivityUpdated(bytes32 indexed deviceId, uint256 timestamp);
    event VersionDeployed(string version, uint256 timestamp);
    
    error DR__DeviceAlreadyRegistered();
    error DR__DeviceNotRegistered();
    error DR__DeviceBanned();
    error DR__NotDeviceOwner();
    error DR__InvalidDeviceId();
    
    modifier deviceExists(bytes32 deviceId) {
        if (devices[deviceId].registeredAt == 0) revert DR__DeviceNotRegistered();
        _;
    }
    
    modifier onlyDeviceOwner(bytes32 deviceId) {
        if (devices[deviceId].owner != msg.sender) revert DR__NotDeviceOwner();
        _;
    }
    
    constructor() Ownable(msg.sender) {
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    function registerDevice(bytes32 deviceId) external {
        if (deviceId == bytes32(0)) revert DR__InvalidDeviceId();
        if (devices[deviceId].registeredAt != 0) revert DR__DeviceAlreadyRegistered();
        
        // Check if deviceId is in lost pool
        if (lostPoolIndex[deviceId] > 0) revert DR__DeviceBanned();
        
        devices[deviceId] = Device({
            deviceId: deviceId,
            owner: msg.sender,
            registeredAt: block.timestamp,
            lastActiveAt: block.timestamp,
            totalRequests: 0,
            active: true
        });
        
        userDevices[msg.sender].push(deviceId);
        
        emit DeviceRegistered(deviceId, msg.sender);
    }
    
    function deactivateDevice(bytes32 deviceId) external deviceExists(deviceId) onlyDeviceOwner(deviceId) {
        devices[deviceId].active = false;
        emit DeviceDeactivated(deviceId);
    }
    
    function updateActivity(bytes32 deviceId) external deviceExists(deviceId) {
        devices[deviceId].lastActiveAt = block.timestamp;
        devices[deviceId].totalRequests++;
        emit DeviceActivityUpdated(deviceId, block.timestamp);
    }
    
    // ============ LOST POOL (PRISON FOR MALICIOUS DEVICES) ============
    
    function sendToLostPool(bytes32 deviceId, string calldata reason) external onlyOwner deviceExists(deviceId) {
        devices[deviceId].active = false;
        
        lostPool.push(deviceId);
        lostPoolIndex[deviceId] = lostPool.length;
        lostPoolCount++;
        
        emit DeviceLostToPool(deviceId, lostPool.length - 1, reason);
    }
    
    function isDeviceRecognized(bytes32 deviceId) external view returns (bool) {
        return devices[deviceId].registeredAt > 0 && devices[deviceId].active;
    }
    
    function isDeviceBanned(bytes32 deviceId) external view returns (bool) {
        return lostPoolIndex[deviceId] > 0;
    }
    
    function getDeviceOwner(bytes32 deviceId) external view returns (address) {
        return devices[deviceId].owner;
    }
    
    function getUserDevices(address user) external view returns (bytes32[] memory) {
        return userDevices[user];
    }
    
    function getLostPoolSize() external view returns (uint256) {
        return lostPoolCount;
    }
}