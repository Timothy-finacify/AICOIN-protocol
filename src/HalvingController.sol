
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract HalvingController {
    uint256 public currentHalving;
    uint256 public blockReward;
    uint256 public nextHalvingBlock;
    uint256 public constant HALVING_INTERVAL = 210000;
    uint256 public constant INITIAL_REWARD = 100 * 10**9;
    uint256 public constant MAX_HALVINGS = 34;
    bool public miningActive;
    string public constant VERSION = "1.0.0";
    
    event HalvingExecuted(uint256 halvingNumber, uint256 newReward, uint256 blockNumber);
    event MiningEnded(uint256 blockNumber);
    event VersionDeployed(string version, uint256 timestamp);
    
    constructor() {
        blockReward = INITIAL_REWARD;
        nextHalvingBlock = block.number + HALVING_INTERVAL;
        miningActive = true;
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    function checkAndExecuteHalving() public {
        require(miningActive, "Mining ended");
        require(block.number >= nextHalvingBlock, "Too early");
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
