// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PaymentRouter {
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant BURN_PERCENT = 20;
    uint256 public constant TREASURY_PERCENT = 110;  // 1.1% — halves every 4 years
    uint256 public constant VALIDATOR_PERCENT = 40;  // 0.4% — FIXED FOREVER
    string public constant VERSION = "1.1.0";
    
    address public immutable treasury;
    address public immutable validatorPool;
    address public immutable aicoinToken;
    address public governance;
    bool public paused;
    
    event PaymentRouted(
        address indexed company,
        uint256 totalAmount,
        uint256 burnAmount,
        uint256 treasuryAmount,
        uint256 validatorAmount,
        uint256 companyAmount
    );
    event VersionDeployed(string version, uint256 timestamp);
    event Paused();
    event Unpaused();
    
    modifier whenNotPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    constructor(address _treasury, address _validatorPool, address _aicoinToken) {
        require(_treasury != address(0), "Treasury zero address");
        require(_validatorPool != address(0), "Validator pool zero address");
        require(_aicoinToken != address(0), "Token zero address");
        treasury = _treasury;
        validatorPool = _validatorPool;
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
        uint256 treasuryAmount = (amount * TREASURY_PERCENT) / 10000;
        uint256 validatorAmount = (amount * VALIDATOR_PERCENT) / 10000;
        uint256 companyAmount = amount - burnAmount - treasuryAmount - validatorAmount;
        
        emit PaymentRouted(company, amount, burnAmount, treasuryAmount, validatorAmount, companyAmount);
        
        _safeTransfer(BURN_ADDRESS, burnAmount);
        _safeTransfer(treasury, treasuryAmount);
        _safeTransfer(validatorPool, validatorAmount);
        _safeTransfer(company, companyAmount);
        
        return true;
    }
    
    function _safeTransfer(address to, uint256 amount) internal {
        (bool success, bytes memory data) = aicoinToken.call(
            abi.encodeWithSignature("transfer(address,uint256)", to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "Transfer failed");
    }
} 