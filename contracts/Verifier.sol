 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Verifier — AIC-Based Validator Staking & Reputation
/// @notice Validators stake AIC. Proof submission. Penalties slash AIC.
contract Verifier is Ownable2Step, ReentrancyGuard {
    
    IERC20 public immutable aicoin;
    address public immutable burnAddress = 0x000000000000000000000000000000000000dEaD;
    
    uint256 public constant CHALLENGE_WINDOW = 20;
    uint256 public constant REPUTATION_PENALTY = 10;
    uint256 public constant RESTORATION_WAIT_DAYS = 30;
    uint256 public constant FULL_RESTORATION_DAYS = 365;
    uint256 public constant MINIMUM_STAKE = 10000 * 10**9;
    string public constant VERSION = "2.0.0";
    
    bool public paused;
    
    struct Offense {
        uint256 timestamp;
        uint256 slashPercent;
        string reason;
    }
    
    struct MinerInfo {
        uint256 stakeAmount;
        int256 reputation;
        uint256 lastOffenseTimestamp;
        uint256 consecutiveHonestDays;
        uint256 restorationStartDay;
        bool isBanned;
    }
    
    mapping(address => MinerInfo) public miners;
    mapping(address => Offense[]) public offenseHistory;
    
    event MinerStaked(address indexed miner, uint256 amount);
    event MinerUnstaked(address indexed miner, uint256 amount);
    event ProofSubmitted(bytes32 indexed submissionId, address indexed miner, bytes32 proofHash);
    event MinerPenalized(address indexed miner, uint256 slashAmount, int256 newReputation, string reason);
    event MinerBanned(address indexed miner);
    event ReputationRestored(address indexed miner, int256 newReputation, uint256 honestDays);
    event VersionDeployed(string version, uint256 timestamp);
    event Paused();
    event Unpaused();
    
    error VF__Paused();
    error VF__MinerBanned();
    error VF__InsufficientStake();
    error VF__NoStakeToSlash();
    error VF__TransferFailed();
    
    modifier whenNotPaused() {
        if (paused) revert VF__Paused();
        _;
    }
    
    constructor(address _aicoin) Ownable(msg.sender) {
        require(_aicoin != address(0), "Zero address");
        aicoin = IERC20(_aicoin);
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    // ============ PAUSE ============
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused();
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused();
    }
    
    // ============ STAKING (AIC ONLY) ============
    
    function stake(uint256 amount) external whenNotPaused nonReentrant {
        if (miners[msg.sender].isBanned) revert VF__MinerBanned();
        if (amount < MINIMUM_STAKE) revert VF__InsufficientStake();
        
        bool success = aicoin.transferFrom(msg.sender, address(this), amount);
        if (!success) revert VF__TransferFailed();
        
        miners[msg.sender].stakeAmount += amount;
        miners[msg.sender].consecutiveHonestDays = 0;
        miners[msg.sender].restorationStartDay = 0;
        
        emit MinerStaked(msg.sender, amount);
    }
    
    function unstake(uint256 amount) external nonReentrant {
        MinerInfo storage miner = miners[msg.sender];
        if (miner.stakeAmount < amount) revert VF__InsufficientStake();
        if (amount == 0) revert VF__InsufficientStake();
        
        uint256 remaining = miner.stakeAmount - amount;
        if (remaining > 0 && remaining < MINIMUM_STAKE) revert VF__InsufficientStake();
        
        miner.stakeAmount = remaining;
        
        bool success = aicoin.transfer(msg.sender, amount);
        if (!success) revert VF__TransferFailed();
        
        emit MinerUnstaked(msg.sender, amount);
    }
    
    // ============ PROOF SUBMISSION ============
    
    function submitProof(bytes32 proofHash) external whenNotPaused returns (bytes32) {
        MinerInfo storage miner = miners[msg.sender];
        if (miner.isBanned) revert VF__MinerBanned();
        if (miner.stakeAmount < MINIMUM_STAKE) revert VF__InsufficientStake();
        
        bytes32 submissionId = keccak256(abi.encodePacked(msg.sender, proofHash, block.number));
        emit ProofSubmitted(submissionId, msg.sender, proofHash);
        return submissionId;
    }
    
    // ============ PENALTIES (SLASH AIC) ============
    
    function penalizeMiner(address minerAddress, string calldata reason) external onlyOwner {
        MinerInfo storage miner = miners[minerAddress];
        if (miner.stakeAmount == 0) revert VF__NoStakeToSlash();
        
        uint256 offenseCount = offenseHistory[minerAddress].length;
        uint256 slashPercent;
        
        if (offenseCount == 0) {
            slashPercent = 50;
        } else {
            slashPercent = 100;
            miner.isBanned = true;
            emit MinerBanned(minerAddress);
        }
        
        uint256 slashAmount = (miner.stakeAmount * slashPercent) / 100;
        miner.stakeAmount -= slashAmount;
        miner.reputation -= int256(REPUTATION_PENALTY);
        miner.lastOffenseTimestamp = block.timestamp;
        miner.consecutiveHonestDays = 0;
        miner.restorationStartDay = 0;
        
        offenseHistory[minerAddress].push(Offense({
            timestamp: block.timestamp,
            slashPercent: slashPercent,
            reason: reason
        }));
        
        // Burn half, keep half in contract
        uint256 burnAmount = slashAmount / 2;
        uint256 keepAmount = slashAmount - burnAmount;
        
        if (burnAmount > 0) {
            aicoin.transfer(burnAddress, burnAmount);
        }
        
        emit MinerPenalized(minerAddress, slashAmount, miner.reputation, reason);
    }
    
    // ============ REPUTATION RESTORATION ============
    
    function recordHonestDay(address minerAddress) external {
        MinerInfo storage miner = miners[minerAddress];
        require(miner.lastOffenseTimestamp > 0, "No offenses");
        if (miner.isBanned) revert VF__MinerBanned();
        
        uint256 daysSinceOffense = (block.timestamp - miner.lastOffenseTimestamp) / 86400;
        
        if (daysSinceOffense >= RESTORATION_WAIT_DAYS) {
            if (miner.restorationStartDay == 0) {
                miner.restorationStartDay = block.timestamp;
            }
            uint256 daysRestoring = (block.timestamp - miner.restorationStartDay) / 86400;
            if (daysSinceOffense > miner.consecutiveHonestDays) {
                miner.consecutiveHonestDays = daysSinceOffense;
                if (daysRestoring >= 30 && miner.reputation < -9) {
                    miner.reputation = -9;
                } else if (daysRestoring >= 60 && miner.reputation < -8) {
                    miner.reputation = -8;
                } else if (daysRestoring >= 90 && miner.reputation < -7) {
                    miner.reputation = -7;
                } else if (daysRestoring >= 180 && miner.reputation < -5) {
                    miner.reputation = -5;
                } else if (daysRestoring >= 270 && miner.reputation < -3) {
                    miner.reputation = -3;
                } else if (daysRestoring >= 365 && miner.reputation < 0) {
                    miner.reputation = 0;
                    miner.lastOffenseTimestamp = 0;
                    miner.restorationStartDay = 0;
                }
                emit ReputationRestored(minerAddress, miner.reputation, miner.consecutiveHonestDays);
            }
        }
    }
    
    // ============ VIEWS ============
    
    function getMinerStatus(address minerAddress) external view returns (
        uint256 stakeAmount,
        int256 reputation,
        bool isBanned,
        uint256 offenseCount,
        uint256 consecutiveHonestDays
    ) {
        MinerInfo storage miner = miners[minerAddress];
        return (
            miner.stakeAmount,
            miner.reputation,
            miner.isBanned,
            offenseHistory[minerAddress].length,
            miner.consecutiveHonestDays
        );
    }
    
    function getOffenseHistory(address minerAddress) external view returns (Offense[] memory) {
        return offenseHistory[minerAddress];
    }
}