// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAICOIN {
    function transfer(address to, uint256 amount) external returns (bool);
}

contract PaymentRouter {
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant BURN_PERCENT = 20;
    uint256 public constant TREASURY_PERCENT = 15;
    
    address public immutable treasury;
    address public immutable aicoinToken;
    
    event PaymentRouted(
        address indexed company,
        uint256 totalAmount,
        uint256 burnAmount,
        uint256 treasuryAmount,
        uint256 companyAmount
    );
    
    constructor(address _treasury, address _aicoinToken) {
        require(_treasury != address(0), "Treasury cannot be zero address");
        require(_aicoinToken != address(0), "Token cannot be zero address");
        treasury = _treasury;
        aicoinToken = _aicoinToken;
    }
    
    function routePayment(address company, uint256 amount) external returns (bool) {
        require(company != address(0), "Company cannot be zero address");
        
        uint256 burnAmount = (amount * BURN_PERCENT) / 100;
        uint256 treasuryAmount = (amount * TREASURY_PERCENT) / 1000;
        uint256 companyAmount = amount - burnAmount - treasuryAmount;
        
        emit PaymentRouted(company, amount, burnAmount, treasuryAmount, companyAmount);
        
        require(IAICOIN(aicoinToken).transfer(BURN_ADDRESS, burnAmount), "Burn transfer failed");
        require(IAICOIN(aicoinToken).transfer(treasury, treasuryAmount), "Treasury transfer failed");
        require(IAICOIN(aicoinToken).transfer(company, companyAmount), "Company transfer failed");
        
        return true;
    }
}