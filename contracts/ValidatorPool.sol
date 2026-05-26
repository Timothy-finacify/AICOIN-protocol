// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IHalvingController {
    function mintBlockReward(address validator) external returns (uint256);
    function getCurrentReward() external view returns (uint256);
}

/// @title ValidatorPool — AIC Staking & Block Reward Distribution
/// @notice Validators stake AIC, receive PaymentRouter fees + block rewards.
contract ValidatorPool is Ownable2Step, ReentrancyGuard {
    
    IERC20 public immutable aicoin;
    IHalvingController public immutable halvingController;
    
    uint256 public totalStaked;
    uint256 public totalFeesCollected;
    uint256 public totalRewardsDistributed;
    
    string public constant VERSION = "2.0.0";
    
    struct Validator {
        uint256 stakedAmount;
        uint256 pendingRewards;
        uint256 totalEarned;
        uint256 lastRewardBlock;
        bool active;
    }
    
    mapping(address => Validator) public validators;
    address[] public validatorList;
    
    event ValidatorStaked(address indexed validator, uint256 amount);
    event ValidatorUnstaked(address indexed validator, uint256 amount);
    event FeesCollected(uint256 amount);
    event RewardDistributed(address indexed validator, uint256 amount);
    event BlockRewardMinted(address indexed validator, uint256 amount);
    event ValidatorPaid(address indexed validator, uint256 feeAmount, uint256 rewardAmount);
    event VersionDeployed(string version, uint256 timestamp);
    
    error VP__ZeroAddress();
    error VP__InsufficientStake();
    error VP__ValidatorNotActive();
    error VP__ValidatorActive();
    error VP__TransferFailed();
    error VP__NoValidators();
    
    constructor(address _aicoin, address _halvingController) Ownable(msg.sender) {
        if (_aicoin == address(0) || _halvingController == address(0)) revert VP__ZeroAddress();
        aicoin = IERC20(_aicoin);
        halvingController = IHalvingController(_halvingController);
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    // ============ STAKING ============
    
    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) revert VP__InsufficientStake();
        
        bool success = aicoin.transferFrom(msg.sender, address(this), amount);
        if (!success) revert VP__TransferFailed();
        
        if (!validators[msg.sender].active && validators[msg.sender].stakedAmount == 0) {
            validatorList.push(msg.sender);
        }
        
        validators[msg.sender].stakedAmount += amount;
        validators[msg.sender].active = true;
        totalStaked += amount;
        
        emit ValidatorStaked(msg.sender, amount);
    }
    
    function unstake(uint256 amount) external nonReentrant {
        Validator storage v = validators[msg.sender];
        if (v.stakedAmount < amount) revert VP__InsufficientStake();
        
        v.stakedAmount -= amount;
        totalStaked -= amount;
        
        if (v.stakedAmount == 0) {
            v.active = false;
        }
        
        bool success = aicoin.transfer(msg.sender, amount);
        if (!success) revert VP__TransferFailed();
        
        emit ValidatorUnstaked(msg.sender, amount);
    }
    
    // ============ COLLECT FEES (CALLED BY PAYMENT ROUTER) ============
    
    function collect(uint256 amount) external {
        totalFeesCollected += amount;
        emit FeesCollected(amount);
    }
    
    // ============ DISTRIBUTE BLOCK REWARD ============
    
    function distributeBlockReward() external {
        if (validatorList.length == 0) revert VP__NoValidators();
        
        uint256 reward = halvingController.getCurrentReward();
        if (reward == 0) return;
        
        // Pick a validator (round-robin based on block number)
        uint256 index = block.number % validatorList.length;
        address validator = validatorList[index];
        
        if (!validators[validator].active) {
            // Find next active validator
            for (uint256 i = 0; i < validatorList.length; i++) {
                address next = validatorList[(index + i) % validatorList.length];
                if (validators[next].active) {
                    validator = next;
                    break;
                }
            }
        }
        
        uint256 minted = halvingController.mintBlockReward(validator);
        validators[validator].totalEarned += minted;
        totalRewardsDistributed += minted;
        
        emit BlockRewardMinted(validator, minted);
    }
    
    // ============ PAY VALIDATOR FEES ============
    
    function payValidatorFee(address validator, uint256 amount) external onlyOwner {
        if (amount == 0) return;
        bool success = aicoin.transfer(validator, amount);
        if (!success) revert VP__TransferFailed();
        validators[validator].totalEarned += amount;
        emit ValidatorPaid(validator, amount, 0);
    }
    
    // ============ VIEWS ============
    
    function getValidatorCount() external view returns (uint256) {
        return validatorList.length;
    }
    
    function getValidatorInfo(address validator) external view returns (
        uint256 staked,
        uint256 earned,
        bool active
    ) {
        Validator storage v = validators[validator];
        return (v.stakedAmount, v.totalEarned, v.active);
    }
    
    function getBalance() external view returns (uint256) {
        return aicoin.balanceOf(address(this));
    }
}