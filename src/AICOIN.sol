// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AICOIN {
    string public name = "AICOIN";
    string public symbol = "AIC";
    uint8 public decimals = 9;
    uint256 public totalSupply = 1000000000 * 10**9;
    uint256 public totalBurned;
    
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant BURN_PERCENT = 20;
    
    mapping(address => uint256) public balanceOf;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event TokensBurned(uint256 amount);
    
    constructor() {
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    function transfer(address to, uint256 amount) public returns (bool) {
        uint256 burnAmount = (amount * BURN_PERCENT) / 100;
        uint256 sendAmount = amount - burnAmount;
        
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[BURN_ADDRESS] += burnAmount;
        balanceOf[to] += sendAmount;
        totalBurned += burnAmount;
        
        emit Transfer(msg.sender, BURN_ADDRESS, burnAmount);
        emit Transfer(msg.sender, to, sendAmount);
        emit TokensBurned(burnAmount);
        
        return true;
    }
}