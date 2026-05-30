 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMintableToken {
    function mint(address to, uint256 amount) external;
}

/// @title HalvingController — Bitcoin-Style Halving & Mining Authority
/// @notice Controls block rewards, executes halvings, mints AIC to validators.
contract HalvingController {
    
    IMintableToken public immutable aicoin;
    address public immutable validatorPool;
    address public governance;
    
    uint256 public currentHalving;
    uint256 public blockReward;
    uint256 public nextHalvingBlock;
    uint256 public totalMined;
    
    uint256 public constant HALVING_INTERVAL = 10512000;
    uint256 public constant INITIAL_REWARD = 10 * 10**9;
    uint256 public constant MAX_HALVINGS = 34;
    uint256 public constant MINABLE_CAP = 1_000_000_000 * 10**9;
    
    bool public miningActive;
    string public constant VERSION = "2.0.0";
    
    event HalvingExecuted(uint256 halvingNumber, uint256 newReward, uint256 blockNumber);
    event BlockRewardMinted(address indexed validator, uint256 amount);
    event MiningEnded(uint256 blockNumber, uint256 totalMined);
    event GovernanceTransferred(address indexed oldGov, address indexed newGov);
    event VersionDeployed(string version, uint256 timestamp);
    
    error HC__NotGovernance();
    error HC__MiningEnded();
    error HC__TooEarly();
    error HC__MaxHalvingsReached();
    error HC__CapReached();
    error HC__NotValidatorPool();
    
    modifier onlyGovernance() {
        if (msg.sender != governance) revert HC__NotGovernance();
        _;
    }
    
    modifier onlyValidatorPool() {
        if (msg.sender != validatorPool) revert HC__NotValidatorPool();
        _;
    }
    
    constructor(address _aicoin, address _validatorPool) {
        require(_aicoin != address(0), "Zero address");
        require(_validatorPool != address(0), "Zero address");
        aicoin = IMintableToken(_aicoin);
        validatorPool = _validatorPool;
        governance = msg.sender;
        blockReward = INITIAL_REWARD;
        nextHalvingBlock = block.number + HALVING_INTERVAL;
        miningActive = true;
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    function transferGovernance(address newGov) external onlyGovernance {
        require(newGov != address(0), "Zero address");
        address oldGov = governance;
        governance = newGov;
        emit GovernanceTransferred(oldGov, newGov);
    }
    
    // ============ HALVING ============
    
    function checkAndExecuteHalving() public {
        if (!miningActive) revert HC__MiningEnded();
        if (block.number < nextHalvingBlock) revert HC__TooEarly();
        if (currentHalving >= MAX_HALVINGS) revert HC__MaxHalvingsReached();
        
        currentHalving++;
        blockReward = INITIAL_REWARD / (2 ** currentHalving);
        nextHalvingBlock = block.number + HALVING_INTERVAL;
        
        if (blockReward < 1 || currentHalving >= MAX_HALVINGS) {
            blockReward = 0;
            miningActive = false;
            emit MiningEnded(block.number, totalMined);
        }
        
        emit HalvingExecuted(currentHalving, blockReward, block.number);
    }
    
    // ============ MINING (CALLED BY VALIDATOR POOL) ============
    
    function mintBlockReward(address validator) external returns (uint256) {
        if (!miningActive) revert HC__MiningEnded();
        if (totalMined + blockReward > MINABLE_CAP) revert HC__CapReached();
        
        totalMined += blockReward;
        aicoin.mint(validator, blockReward);
        
        emit BlockRewardMinted(validator, blockReward);
        return blockReward;
    }
    
    // ============ VIEWS ============
    
    function getCurrentReward() public view returns (uint256) {
        if (!miningActive) return 0;
        if (block.number >= nextHalvingBlock) {
            uint256 nextH = currentHalving + 1;
            if (nextH >= MAX_HALVINGS) return 0;
            return INITIAL_REWARD / (2 ** nextH);
        }
        return blockReward;
    }
    
    function blocksUntilHalving() public view returns (uint256) {
        if (!miningActive || block.number >= nextHalvingBlock) return 0;
        return nextHalvingBlock - block.number;
    }
}