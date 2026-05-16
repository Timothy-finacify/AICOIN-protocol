// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IUniswapV3Pool {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function observe(uint32[] calldata secondsAgos)
        external
        view
        returns (int56[] memory tickCumulatives, uint160[] memory secondsPerLiquidityCumulativeX128s);
}

contract Verifier {
    uint256 public constant CHALLENGE_WINDOW = 20;
    uint256 public constant TARGET_STAKE_USD = 10; // $10 USD
    uint256 public constant REPUTATION_PENALTY = 10;
    uint256 public constant RESTORATION_WAIT_DAYS = 30;
    uint256 public constant FULL_RESTORATION_DAYS = 365;
    
    address public uniswapPool;
    address public aicToken;
    address public usdcToken;
    
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
    
    constructor(address _uniswapPool, address _aicToken, address _usdcToken) {
        uniswapPool = _uniswapPool;
        aicToken = _aicToken;
        usdcToken = _usdcToken;
    }
    
    // ============================================================
    // DYNAMIC STAKE CALCULATION
    // ============================================================
    
    function getAICPrice() public view returns (uint256) {
        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = 3600; // 1 hour ago
        secondsAgos[1] = 0;    // now
        
        (int56[] memory tickCumulatives, ) = IUniswapV3Pool(uniswapPool).observe(secondsAgos);
        
        int56 tickDifference = tickCumulatives[1] - tickCumulatives[0];
        int24 timeWeightedTick = int24(tickDifference / 3600);
        
        // Convert tick to price: price = 1.0001^tick
        // For AIC/USDC pool where USDC is token0:
        // If AIC is token1, price = 1.0001^tick * 10^(decimals0-decimals1)
        // Simplified: we assume AIC is token1 and USDC is token0 (6 decimals)
        uint256 price = uint256(int256(1000000 * 10**12)); // Base: $1.00 = 1e18
        // This is a simplified price calculation. Production needs full oracle.
        return price;
    }
    
    function getMinimumStake() public view returns (uint256) {
        uint256 aicPriceInUSDC = getAICPrice(); // USDC has 6 decimals
        
        // TARGET_STAKE_USD * 10^18 / aicPriceInUSDC
        // If AIC = $0.001, stake = 10 * 10^18 / (0.001 * 10^18) = 10,000 AIC
        // If AIC = $100, stake = 10 * 10^18 / (100 * 10^18) = 0.1 AIC (in nano: 10^8)
        
        if (aicPriceInUSDC == 0) return 10000 * 10**9; // Fallback: 10,000 AIC
        
        uint256 stakeInNano = (TARGET_STAKE_USD * 10**27) / aicPriceInUSDC;
        
        // Minimum floor: 0.1 AIC (100,000,000 nano)
        if (stakeInNano < 100000000) stakeInNano = 100000000;
        
        return stakeInNano;
    }
    
    // ============================================================
    // STAKING
    // ============================================================
    
    function stake() external payable {
        require(!miners[msg.sender].isBanned, "Miner is banned");
        
        uint256 minStake = getMinimumStake();
        require(msg.value >= minStake, "Insufficient stake");
        
        miners[msg.sender].stakeAmount = msg.value;
        
        // Reset honest day counter on new stake
        miners[msg.sender].consecutiveHonestDays = 0;
        miners[msg.sender].restorationStartDay = 0;
        
        emit StakeUpdated(msg.sender, 0, msg.value);
    }
    
    function withdrawStake(uint256 amount) external {
        MinerInfo storage miner = miners[msg.sender];
        require(miner.stakeAmount >= amount, "Insufficient stake");
        require(amount > 0, "Amount must be positive");
        
        uint256 minStake = getMinimumStake();
        require(miner.stakeAmount - amount >= minStake, "Must maintain minimum stake");
        
        miner.stakeAmount -= amount;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
    }
    
    // ============================================================
    // PROOF SUBMISSION & CHALLENGE
    // ============================================================
    
    function submitProof(bytes32 proofHash) external returns (bytes32) {
        MinerInfo storage miner = miners[msg.sender];
        require(!miner.isBanned, "Miner is banned");
        require(miner.stakeAmount >= getMinimumStake(), "Insufficient stake");
        
        bytes32 submissionId = keccak256(abi.encodePacked(msg.sender, proofHash, block.number));
        
        emit ProofSubmitted(submissionId, msg.sender, proofHash);
        return submissionId;
    }
    
    // ============================================================
    // PUNISHMENT SYSTEM
    // ============================================================
    
    function penalizeMiner(address minerAddress, string calldata reason) external {
        MinerInfo storage miner = miners[minerAddress];
        require(miner.stakeAmount > 0, "No stake to slash");
        
        uint256 offenseCount = offenseHistory[minerAddress].length;
        uint256 slashPercent;
        
        if (offenseCount == 0) {
            // First offense: 50% slash
            slashPercent = 50;
        } else if (offenseCount == 1) {
            // Second offense: 100% slash + 30-day ban
            slashPercent = 100;
            miner.isBanned = true;
            emit MinerBanned(minerAddress);
        } else {
            // Third offense: permanent ban (already handled)
            miner.isBanned = true;
            slashPercent = 100;
            emit MinerBanned(minerAddress);
        }
        
        uint256 slashAmount = (miner.stakeAmount * slashPercent) / 100;
        miner.stakeAmount -= slashAmount;
        miner.reputation -= int256(int8(REPUTATION_PENALTY));
        miner.lastOffenseTimestamp = block.timestamp;
        miner.consecutiveHonestDays = 0;
        miner.restorationStartDay = 0;
        
        offenseHistory[minerAddress].push(Offense({
            timestamp: block.timestamp,
            slashPercent: slashPercent,
            reason: reason
        }));
        
        // Burn 50% of slashed amount, keep 50% in contract
        uint256 burnAmount = slashAmount / 2;
        payable(address(0x000000000000000000000000000000000000dEaD)).transfer(burnAmount);
        
        emit MinerPenalized(minerAddress, slashAmount, miner.reputation, reason);
    }
    
    // ============================================================
    // REPUTATION RESTORATION
    // ============================================================
    
    function recordHonestDay(address minerAddress) external {
        MinerInfo storage miner = miners[minerAddress];
        require(miner.lastOffenseTimestamp > 0, "No offenses to recover from");
        require(!miner.isBanned, "Miner is banned");
        
        uint256 daysSinceOffense = (block.timestamp - miner.lastOffenseTimestamp) / 86400;
        
        // 30-day waiting period before restoration begins
        if (daysSinceOffense >= RESTORATION_WAIT_DAYS) {
            if (miner.restorationStartDay == 0) {
                miner.restorationStartDay = block.timestamp;
            }
            
            uint256 daysRestoring = (block.timestamp - miner.restorationStartDay) / 86400;
            uint256 daysSinceLastRecord = (block.timestamp - miner.lastOffenseTimestamp) / 86400;
            
            if (daysSinceLastRecord > miner.consecutiveHonestDays) {
                miner.consecutiveHonestDays = daysSinceLastRecord;
                
                // Calculate restoration: +1 every 30 days, up to +10 over 365 days
                if (daysRestoring >= 30 && daysRestoring < 60 && miner.reputation < -9) {
                    miner.reputation = -9;
                    emit ReputationRestored(minerAddress, miner.reputation, miner.consecutiveHonestDays);
                } else if (daysRestoring >= 60 && daysRestoring < 90 && miner.reputation < -8) {
                    miner.reputation = -8;
                    emit ReputationRestored(minerAddress, miner.reputation, miner.consecutiveHonestDays);
                } else if (daysRestoring >= 90 && daysRestoring < 180 && miner.reputation < -7) {
                    miner.reputation = -7;
                    emit ReputationRestored(minerAddress, miner.reputation, miner.consecutiveHonestDays);
                } else if (daysRestoring >= 180 && daysRestoring < 270 && miner.reputation < -5) {
                    miner.reputation = -5;
                    emit ReputationRestored(minerAddress, miner.reputation, miner.consecutiveHonestDays);
                } else if (daysRestoring >= 270 && daysRestoring < 365 && miner.reputation < -3) {
                    miner.reputation = -3;
                    emit ReputationRestored(minerAddress, miner.reputation, miner.consecutiveHonestDays);
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
    // PUBLIC VIEWS
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