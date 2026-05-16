// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AICoinSession {
    mapping(address => mapping(address => uint256)) public allowances;
    mapping(address => uint256) public dailySpent;
    mapping(address => uint256) public lastResetDay;
    
    uint256 public constant MAX_DAILY = 1000 * 10**9;
    string public constant VERSION = "1.0.0";
    
    event SessionApproved(address indexed user, address indexed dapp, uint256 amount);
    event SessionSpent(address indexed user, address indexed dapp, uint256 amount);
    event VersionDeployed(string version, uint256 timestamp);
    
    constructor() {
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    function approveSession(address dapp, uint256 amount) external {
        allowances[msg.sender][dapp] = amount;
        emit SessionApproved(msg.sender, dapp, amount);
    }
    
    function spendFromSession(address user, address to, uint256 amount) external returns (bool) {
        uint256 today = block.timestamp / 86400;
        if (lastResetDay[user] != today) {
            dailySpent[user] = 0;
            lastResetDay[user] = today;
        }
        
        require(allowances[user][msg.sender] >= amount, "Insufficient allowance");
        require(dailySpent[user] + amount <= MAX_DAILY, "Daily limit exceeded");
        
        allowances[user][msg.sender] -= amount;
        dailySpent[user] += amount;
        
        emit SessionSpent(user, msg.sender, amount);
        return true;
    }
}