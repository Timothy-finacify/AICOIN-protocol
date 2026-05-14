// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HalvingController {
    uint256 public currentHalving;
    uint256 public blockReward;
    uint256 public nextHalvingBlock;
    uint256 public constant HALVING_INTERVAL = 210000; // ~4 years
    uint256 public constant INITIAL_REWARD = 100 * 10**9; // 100 AIC in nano units
    uint256 public constant MAX_HALVINGS = 34;
    bool public miningActive;
    
    event HalvingExecuted(uint256 halvingNumber, uint256 newReward, uint256 blockNumber);
    event MiningEnded(uint256 blockNumber);
    
    constructor() {
        blockReward = INITIAL_REWARD;
        nextHalvingBlock = block.number + HALVING_INTERVAL;
        miningActive = true;
    }
    
    function checkAndExecuteHalving() public {
        require(miningActive, "Mining ended");
        require(block.number >= nextHalvingBlock, "Too early for halving");
        require(currentHalving < MAX_HALVINGS, "Max halvings reached");
        
        currentHalving++;
        blockReward = INITIAL_REWARD / (2 ** currentHalving);
        nextHalvingBlock = block.number + HALVING_INTERVAL;
        
        if (blockReward < 1 || currentHalving >= MAX_HALVINGS) {
            blockReward = 0;
            miningActive = false;
            emit MiningEnded(block.number);
        }
        
        emit HalvingExecuted(currentHalving, blockReward, block.number);
    }
    
    function getCurrentReward() public view returns (uint256) {
        if (block.number >= nextHalvingBlock && miningActive) {
            uint256 nextHalving = currentHalving + 1;
            if (nextHalving >= MAX_HALVINGS) return 0;
            return INITIAL_REWARD / (2 ** nextHalving);
        }
        return blockReward;
    }
    
    function blocksUntilHalving() public view returns (uint256) {
        if (!miningActive || block.number >= nextHalvingBlock) return 0;
        return nextHalvingBlock - block.number;
    }
}