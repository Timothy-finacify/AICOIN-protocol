// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PaymentRouter {
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant BURN_PERCENT = 20;
    uint256 public constant TREASURY_PERCENT = 15;
    string public constant VERSION = "1.0.0";
    
    address public immutable treasury;
    address public immutable aicoinToken;
    address public governance;
    bool public paused;
    
    event PaymentRouted(address indexed company, uint256 totalAmount, uint256 burnAmount, uint256 treasuryAmount, uint256 companyAmount);
    event VersionDeployed(string version, uint256 timestamp);
    event Paused();
    event Unpaused();
    
    modifier whenNotPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    constructor(address _treasury, address _aicoinToken) {
        require(_treasury != address(0), "Treasury zero address");
        require(_aicoinToken != address(0), "Token zero address");
        treasury = _treasury;
        aicoinToken = _aicoinToken;
        governance = msg.sender;
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    function pause() external {
        require(msg.sender == governance, "Only governance");
        paused = true;
        emit Paused();
    }
    
    function unpause() external {
        require(msg.sender == governance, "Only governance");
        paused = false;
        emit Unpaused();
    }
    
    function routePayment(address company, uint256 amount) external whenNotPaused returns (bool) {
        require(company != address(0), "Company zero address");
        
        uint256 burnAmount = (amount * BURN_PERCENT) / 100;
        uint256 treasuryAmount = (amount * TREASURY_PERCENT) / 1000;
        uint256 companyAmount = amount - burnAmount - treasuryAmount;
        
        emit PaymentRouted(company, amount, burnAmount, treasuryAmount, companyAmount);
        
        _safeTransfer(BURN_ADDRESS, burnAmount);
        _safeTransfer(treasury, treasuryAmount);
        _safeTransfer(company, companyAmount);
        
        return true;
    }
    
    function _safeTransfer(address to, uint256 amount) internal {
        (bool success, bytes memory data) = aicoinToken.call(abi.encodeWithSignature("transfer(address,uint256)", to, amount));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "Transfer failed");
    }
}