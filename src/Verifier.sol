// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IChainlinkAggregator {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

contract Verifier {
    uint256 public constant CHALLENGE_WINDOW = 20;
    uint256 public constant TARGET_STAKE_USD = 10;
    uint256 public constant REPUTATION_PENALTY = 10;
    uint256 public constant RESTORATION_WAIT_DAYS = 30;
    uint256 public constant FULL_RESTORATION_DAYS = 365;
    string public constant VERSION = "1.0.0";
    
    address public priceFeed;
    address public governance;
    bool public useManualStake = true;
    uint256 public manualStakeAmount = 10000 * 10**9;
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
    
    event ProofSubmitted(bytes32 indexed submissionId, address indexed miner, bytes32 proofHash);
    event MinerPenalized(address indexed miner, uint256 slashAmount, int256 newReputation, string reason);
    event MinerBanned(address indexed miner);
    event ReputationRestored(address indexed miner, int256 newReputation, uint256 honestDays);
    event StakeUpdated(address indexed miner, uint256 oldAmount, uint256 newAmount);
    event PriceFeedUpdated(address indexed oldFeed, address indexed newFeed);
    event ManualStakeDisabled();
    event VersionDeployed(string version, uint256 timestamp);
    event Paused();
    event Unpaused();
    
    modifier whenNotPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    constructor() {
        governance = msg.sender;
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    // ============================================================
    // GOVERNANCE
    // ============================================================
    
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
    
    // ============================================================
    // PRICE FEED
    // ============================================================
    
    function setPriceFeed(address _priceFeed) external {
        require(msg.sender == governance, "Only governance");
        address oldFeed = priceFeed;
        priceFeed = _priceFeed;
        emit PriceFeedUpdated(oldFeed, _priceFeed);
    }
    
    function disableManualStake() external {
        require(msg.sender == governance, "Only governance");
        require(priceFeed != address(0), "Price feed must be set first");
        useManualStake = false;
        emit ManualStakeDisabled();
    }
    
    function setManualStakeAmount(uint256 amount) external {
        require(msg.sender == governance, "Only governance");
        manualStakeAmount = amount;
    }
    
    function getAICPrice() public view returns (uint256) {
        if (priceFeed == address(0)) return 0;
        (, int256 answer, , , ) = IChainlinkAggregator(priceFeed).latestRoundData();
        if (answer <= 0) return 0;
        return uint256(answer) * 10**10;
    }
    
    function getMinimumStake() public view returns (uint256) {
        if (useManualStake) return manualStakeAmount;
        uint256 aicPriceInUSD = getAICPrice();
        if (aicPriceInUSD == 0) return 10000 * 10**9;
        uint256 stakeInNano = (TARGET_STAKE_USD * 10**36) / aicPriceInUSD;
        if (stakeInNano < 10000000) stakeInNano = 10000000;
        if (stakeInNano > 100000 * 10**9) stakeInNano = 100000 * 10**9;
        return stakeInNano;
    }
    
    // ============================================================
    // STAKING
    // ============================================================
    
    function stake() external payable whenNotPaused {
        require(!miners[msg.sender].isBanned, "Miner is banned");
        uint256 minStake = getMinimumStake();
        require(msg.value >= minStake, "Insufficient stake");
        miners[msg.sender].stakeAmount = msg.value;
        miners[msg.sender].consecutiveHonestDays = 0;
        miners[msg.sender].restorationStartDay = 0;
        emit StakeUpdated(msg.sender, 0, msg.value);
    }
    
    function withdrawStake(uint256 amount) external {
        MinerInfo storage miner = miners[msg.sender];
        require(miner.stakeAmount >= amount, "Insufficient stake");
        require(amount > 0, "Amount must be positive");
        uint256 minStake = getMinimumStake();
        require(miner.stakeAmount - amount >= minStake || miner.stakeAmount - amount == 0, 
                "Must maintain minimum stake or withdraw fully");
        miner.stakeAmount -= amount;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
    }
    
    // ============================================================
    // PROOF SUBMISSION
    // ============================================================
    
    function submitProof(bytes32 proofHash) external whenNotPaused returns (bytes32) {
        MinerInfo storage miner = miners[msg.sender];
        require(!miner.isBanned, "Miner is banned");
        require(miner.stakeAmount >= getMinimumStake(), "Insufficient stake");
        bytes32 submissionId = keccak256(abi.encodePacked(msg.sender, proofHash, block.number));
        emit ProofSubmitted(submissionId, msg.sender, proofHash);
        return submissionId;
    }
    
    // ============================================================
    // PUNISHMENT
    // ============================================================
    
    function penalizeMiner(address minerAddress, string calldata reason) external {
        MinerInfo storage miner = miners[minerAddress];
        require(miner.stakeAmount > 0, "No stake to slash");
        uint256 offenseCount = offenseHistory[minerAddress].length;
        uint256 slashPercent;
        
        if (offenseCount == 0) {
            slashPercent = 50;
        } else if (offenseCount == 1) {
            slashPercent = 100;
            miner.isBanned = true;
            emit MinerBanned(minerAddress);
        } else {
            miner.isBanned = true;
            slashPercent = 100;
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
        
        uint256 burnAmount = slashAmount / 2;
        payable(address(0x000000000000000000000000000000000000dEaD)).transfer(burnAmount);
        emit MinerPenalized(minerAddress, slashAmount, miner.reputation, reason);
    }
    
    // ============================================================
    // REPUTATION RESTORATION
    // ============================================================
    
    function recordHonestDay(address minerAddress) external {
        MinerInfo storage miner = miners[minerAddress];
        require(miner.lastOffenseTimestamp > 0, "No offenses");
        require(!miner.isBanned, "Miner is banned");
        
        uint256 daysSinceOffense = (block.timestamp - miner.lastOffenseTimestamp) / 86400;
        
        if (daysSinceOffense >= RESTORATION_WAIT_DAYS) {
            if (miner.restorationStartDay == 0) {
                miner.restorationStartDay = block.timestamp;
            }
            uint256 daysRestoring = (block.timestamp - miner.restorationStartDay) / 86400;
            if (daysSinceOffense > miner.consecutiveHonestDays) {
                miner.consecutiveHonestDays = daysSinceOffense;
                if (daysRestoring >= 30 && daysRestoring < 60 && miner.reputation < -9) {
                    miner.reputation = -9;
                    emit ReputationRestored(minerAddress, miner.reputation, miner.consecutiveHonestDays);
                } else if (daysRestoring >= 60 && daysRestoring < 90 && miner.reputation < -8) {
                    miner.reputation = -8;
                } else if (daysRestoring >= 90 && daysRestoring < 180 && miner.reputation < -7) {
                    miner.reputation = -7;
                } else if (daysRestoring >= 180 && daysRestoring < 270 && miner.reputation < -5) {
                    miner.reputation = -5;
                } else if (daysRestoring >= 270 && daysRestoring < 365 && miner.reputation < -3) {
                    miner.reputation = -3;
                } else if (daysRestoring >= 365 && miner.reputation < 0) {
                    miner.reputation = 0;
                    miner.lastOffenseTimestamp = 0;
                    miner.restorationStartDay = 0;
                    emit ReputationRestored(minerAddress, miner.reputation, miner.consecutiveHonestDays);
                }
            }
        }
    }
    
    // ============================================================
    // VIEWS
    // ============================================================
    
    function getMinerReputation(address minerAddress) external view returns (int256) {
        return miners[minerAddress].reputation;
    }
    
    function getStakeAmount(address minerAddress) external view returns (uint256) {
        return miners[minerAddress].stakeAmount;
    }
    
    function isMinerBanned(address minerAddress) external view returns (bool) {
        return miners[minerAddress].isBanned;
    }
    
    function getOffenseCount(address minerAddress) external view returns (uint256) {
        return offenseHistory[minerAddress].length;
    }
    
    function getOffenseHistory(address minerAddress) external view returns (Offense[] memory) {
        return offenseHistory[minerAddress];
    }
    
    function getMinerStatus(address minerAddress) external view returns (
        uint256 stakeAmount,
        int256 reputation,
        bool isBanned,
        uint256 offenseCount,
        uint256 consecutiveHonestDays,
        uint256 daysUntilRestoration
    ) {
        MinerInfo storage miner = miners[minerAddress];
        uint256 daysSinceOffense = 0;
        uint256 daysUntil = 0;
        if (miner.lastOffenseTimestamp > 0) {
            daysSinceOffense = (block.timestamp - miner.lastOffenseTimestamp) / 86400;
            if (daysSinceOffense < RESTORATION_WAIT_DAYS) {
                daysUntil = RESTORATION_WAIT_DAYS - daysSinceOffense;
            }
        }
        return (
            miner.stakeAmount,
            miner.reputation,
            miner.isBanned,
            offenseHistory[minerAddress].length,
            miner.consecutiveHonestDays,
            daysUntil
        );
    }
} 