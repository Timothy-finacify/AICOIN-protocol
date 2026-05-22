// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ValidatorPool {
    address public governance;
    uint256 public totalCollected;
    
    event ValidatorFeesCollected(uint256 amount);
    event ValidatorPaid(address indexed validator, uint256 amount);
    
    constructor() {
        governance = msg.sender;
    }
    
    // Receives AIC tokens from PaymentRouter
    function collect(uint256 amount) external {
        totalCollected += amount;
        emit ValidatorFeesCollected(amount);
    }
    
    // Pay validators from the pool
    function payValidator(address validator, uint256 amount) external {
        require(msg.sender == governance, "Only governance");
        emit ValidatorPaid(validator, amount);
    }
}