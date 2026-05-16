// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAICOIN {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract AICOIN is IAICOIN {
    string public constant name = "AICOIN";
    string public constant symbol = "AIC";
    uint8 public constant decimals = 9;
    uint256 public constant totalSupply = 1_000_000_000 * 10**9;
    uint256 public totalBurned;
    
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant BURN_PERCENT = 20;
    uint256 public constant MAX_TRANSFER = 10_000_000 * 10**9;
    uint256 public constant MINIMUM_BURN = 10;
    uint256 public constant MILESTONE_INTERVAL = 10_000_000 * 10**9;
    uint256 public lastMilestone;
    string public constant VERSION = "1.0.0";
    
    mapping(address => uint256) public override balanceOf;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event TokensBurned(uint256 amount);
    event BurnMilestone(uint256 totalBurned, uint256 milestoneNumber);
    event VersionDeployed(string version, uint256 timestamp);
    
    constructor() {
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(amount <= MAX_TRANSFER, "Exceeds maximum transfer");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        uint256 burnAmount = (amount * BURN_PERCENT) / 100;
        if (burnAmount < MINIMUM_BURN && amount > 0) {
            burnAmount = MINIMUM_BURN;
        }
        uint256 sendAmount = amount - burnAmount;
        
        balanceOf[msg.sender] -= amount;
        balanceOf[BURN_ADDRESS] += burnAmount;
        balanceOf[to] += sendAmount;
        totalBurned += burnAmount;
        
        emit Transfer(msg.sender, BURN_ADDRESS, burnAmount);
        emit Transfer(msg.sender, to, sendAmount);
        emit TokensBurned(burnAmount);
        
        if (totalBurned >= lastMilestone + MILESTONE_INTERVAL) {
            lastMilestone = totalBurned;
            emit BurnMilestone(totalBurned, totalBurned / MILESTONE_INTERVAL);
        }
        
        return true;
    }
}