// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

interface IHalvingController {
    function miningActive() external view returns (bool);
}

/// @title MiningReserve — Locks 0.40% fees until mining ends, then pays validators forever
/// @notice 0.40% of every payment accumulates here. Locked for ~136 years until all AIC mined.
/// @dev When mining ends, funds are released gradually to ValidatorPool to sustain validators.
contract MiningReserve is Ownable2Step {
    
    IERC20 public immutable aicoin;
    address public immutable validatorPool;
    IHalvingController public immutable halvingController;
    
    uint256 public totalReserved;
    uint256 public totalReleased;
    uint256 public releaseStartTime;
    uint256 public constant MONTHLY_RELEASE_RATE = 1; // 1% per month of remaining reserve
    
    bool public miningHasEnded;
    bool public releaseActive;
    
    string public constant VERSION = "1.0.0";
    
    event FeesCollected(uint256 amount);
    event MiningEnded(uint256 timestamp, uint256 totalReserved);
    event FundsReleased(address indexed to, uint256 amount, uint256 remaining);
    event VersionDeployed(string version, uint256 timestamp);
    
    error MRV__MiningNotEnded();
    error MRV__AlreadyReleased();
    error MRV__TransferFailed();
    error MRV__NotValidatorPool();
    error MRV__ZeroAddress();
    
    modifier onlyAfterMining() {
        if (!miningHasEnded) revert MRV__MiningNotEnded();
        _;
    }
    
    modifier onlyValidatorPool() {
        if (msg.sender != validatorPool) revert MRV__NotValidatorPool();
        _;
    }
    
    constructor(address _aicoin, address _validatorPool, address _halvingController) Ownable(msg.sender) {
        if (_aicoin == address(0)) revert MRV__ZeroAddress();
        if (_validatorPool == address(0)) revert MRV__ZeroAddress();
        if (_halvingController == address(0)) revert MRV__ZeroAddress();
        
        aicoin = IERC20(_aicoin);
        validatorPool = _validatorPool;
        halvingController = IHalvingController(_halvingController);
        
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    // ============ COLLECTION (CALLED BY PAYMENT ROUTER) ============
    
    /// @notice Receives 0.40% from every payment. Called by PaymentRouter.
    function collect(uint256 amount) external {
        totalReserved += amount;
        emit FeesCollected(amount);
    }
    
    // ============ END MINING (CALLED BY HALVING CONTROLLER) ============
    
    /// @notice Called by HalvingController when last block is mined (all 1B AIC mined)
    function endMining() external {
        require(msg.sender == address(halvingController), "Only HalvingController");
        require(!miningHasEnded, "Already ended");
        
        miningHasEnded = true;
        releaseStartTime = block.timestamp;
        releaseActive = true;
        
        emit MiningEnded(block.timestamp, totalReserved);
    }
    
    // ============ RELEASE (CALLED BY VALIDATOR POOL AFTER MINING ENDS) ============
    
    /// @notice Releases a portion of the reserve to ValidatorPool monthly
    /// @dev 1% of remaining reserve released per month. Never fully depletes.
    function releaseMonthly() external onlyAfterMining onlyValidatorPool returns (uint256) {
        if (!releaseActive) revert MRV__AlreadyReleased();
        
        uint256 remaining = totalReserved - totalReleased;
        if (remaining == 0) return 0;
        
        // 1% of remaining reserve released per month
        uint256 releaseAmount = (remaining * MONTHLY_RELEASE_RATE) / 100;
        if (releaseAmount == 0 && remaining > 0) {
            releaseAmount = remaining; // Release dust
        }
        
        totalReleased += releaseAmount;
        
        bool success = aicoin.transfer(validatorPool, releaseAmount);
        if (!success) revert MRV__TransferFailed();
        
        emit FundsReleased(validatorPool, releaseAmount, remaining - releaseAmount);
        return releaseAmount;
    }
    
    // ============ EMERGENCY GOVERNANCE ============
    
    /// @notice Governance can pause release in extreme circumstances
    function pauseRelease() external onlyOwner {
        releaseActive = false;
    }
    
    function resumeRelease() external onlyOwner {
        require(miningHasEnded, "Mining not ended");
        releaseActive = true;
    }
    
    // ============ VIEWS ============
    
    function getRemainingReserve() external view returns (uint256) {
        return totalReserved - totalReleased;
    }
    
    function getBalance() external view returns (uint256) {
        return aicoin.balanceOf(address(this));
    }
    
    function getMonthlyReleaseAmount() external view returns (uint256) {
        if (!miningHasEnded) return 0;
        uint256 remaining = totalReserved - totalReleased;
        return (remaining * MONTHLY_RELEASE_RATE) / 100;
    }
    
    function getYearsOfSustenance() external view returns (uint256) {
        // Estimates how many years the reserve can pay validators at current rate
        uint256 remaining = totalReserved - totalReleased;
        if (remaining == 0) return 0;
        
        uint256 yearlyRelease = (remaining * MONTHLY_RELEASE_RATE * 12) / 100;
        if (yearlyRelease == 0) return 1;
        
        // With 1% monthly release, the reserve never fully depletes
        // This gives approximate years until reserve drops below 1 AIC
        uint256 yrs = 0;
        uint256 simulated = remaining;
        while (simulated > 1e9 && yrs < 1000) {
            uint256 yearly = (simulated * MONTHLY_RELEASE_RATE * 12) / 100;
            simulated -= yearly;
            yrs++;
        }
        return yrs;
    }
} 