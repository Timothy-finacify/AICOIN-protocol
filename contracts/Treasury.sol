 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IHalvingController {
    function currentHalving() external view returns (uint256);
}

contract Treasury is Ownable2Step, ReentrancyGuard {
    
    // ============ IMMUTABLES ============
    
    IERC20 public immutable aicoin;
    address public immutable halvingController;
    
    // ============ CONSTANTS ============
    
    uint256 public constant INITIAL_TREASURY_FEE = 110;  // 1.10% — halves every 4 years
    uint256 public constant VALIDATOR_FEE = 40;          // 0.40% — FIXED FOREVER
    uint256 public constant MAX_TREASURY = 100_000_000 * 10**9; // 100M AIC cap
    uint256 public constant BPS_DENOMINATOR = 10000;
    string public constant VERSION = "2.0.0";
    
    // ============ STATE ============
    
    uint256 public treasuryFee;
    uint256 public totalCollected;
    uint256 public totalWithdrawn;
    uint256 public lastHalvingApplied;
    
    // ============ EVENTS ============
    
    event FundsCollected(address indexed from, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount, string reason);
    event TreasuryFeeUpdated(uint256 oldFee, uint256 newFee);
    event VersionDeployed(string version, uint256 timestamp);
    
    // ============ ERRORS ============
    
    error Treasury__NotPaymentRouter();
    error Treasury__TreasuryFull();
    error Treasury__ZeroAddress();
    error Treasury__InsufficientBalance();
    error Treasury__TransferFailed();
    
    // ============ CONSTRUCTOR ============
    
    constructor(address _aicoin, address _halvingController) Ownable(msg.sender) {
        if (_aicoin == address(0)) revert Treasury__ZeroAddress();
        if (_halvingController == address(0)) revert Treasury__ZeroAddress();
        
        aicoin = IERC20(_aicoin);
        halvingController = _halvingController;
        treasuryFee = INITIAL_TREASURY_FEE;
        
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    // ============ FEE LOGIC ============
    
    function syncWithHalving() public {
        uint256 currentHalving = IHalvingController(halvingController).currentHalving();
        if (currentHalving > lastHalvingApplied) {
            uint256 newFee = INITIAL_TREASURY_FEE / (2 ** currentHalving);
            if (newFee < 1) newFee = 0;
            uint256 oldFee = treasuryFee;
            treasuryFee = newFee;
            lastHalvingApplied = currentHalving;
            emit TreasuryFeeUpdated(oldFee, newFee);
        }
    }
    
    function getCurrentFee() public returns (uint256) {
        syncWithHalving();
        return treasuryFee;
    }
    
    function getValidatorFee() public pure returns (uint256) {
        return VALIDATOR_FEE;
    }
    
    // ============ COLLECT (CALLED BY PAYMENT ROUTER) ============
    
    /// @notice Called by PaymentRouter when routing a payment.
    /// @dev PaymentRouter must transfer AIC to this contract BEFORE calling collect.
    ///      Or we pull here. For simplicity, PaymentRouter sends first, then calls this.
    function collect(address from, uint256 amount) external {
        // In the flow, PaymentRouter sends tokens directly to this address.
        // This function records the collection and enforces the cap.
        if (totalCollected + amount > MAX_TREASURY) revert Treasury__TreasuryFull();
        totalCollected += amount;
        emit FundsCollected(from, amount);
    }
    
    // ============ WITHDRAW (GOVERNANCE ONLY) ============
    
    function withdraw(address to, uint256 amount, string calldata reason) external onlyOwner nonReentrant {
        if (to == address(0)) revert Treasury__ZeroAddress();
        if (amount > getBalance()) revert Treasury__InsufficientBalance();
        
        totalWithdrawn += amount;
        
        emit FundsWithdrawn(to, amount, reason);
        
        bool success = aicoin.transfer(to, amount);
        if (!success) revert Treasury__TransferFailed();
    }
    
    // ============ VIEWS ============
    
    function getBalance() public view returns (uint256) {
        return aicoin.balanceOf(address(this));
    }
    
    function getAvailableToWithdraw() public view returns (uint256) {
        return getBalance();
    }
} 