// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Verifier {
    uint256 public constant CHALLENGE_WINDOW = 20;
    uint256 public constant MIN_STAKE = 1000 * 10**9;
    
    struct MiningSubmission {
        address miner;
        bytes32 proofHash;
        uint256 blockNumber;
        bool challenged;
        bool accepted;
    }
    
    mapping(bytes32 => MiningSubmission) public submissions;
    mapping(address => uint256) public stakes;
    mapping(address => int256) public reputation;
    
    event ProofSubmitted(bytes32 indexed submissionId, address indexed miner, bytes32 proofHash);
    event ChallengeRaised(bytes32 indexed submissionId, address indexed challenger);
    event ChallengeResolved(bytes32 indexed submissionId, bool honest);
    event MinerSlashed(address indexed miner, uint256 amount);
    event StakeWithdrawn(address indexed miner, uint256 amount);
    
    function stake() external payable {
        require(msg.value >= MIN_STAKE, "Insufficient stake");
        stakes[msg.sender] += msg.value;
    }
    
    function withdrawStake(uint256 amount) external {
        require(stakes[msg.sender] >= amount, "Insufficient stake balance");
        require(amount > 0, "Amount must be positive");
        stakes[msg.sender] -= amount;
        emit StakeWithdrawn(msg.sender, amount);
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
    }
    
    function submitProof(bytes32 proofHash) external returns (bytes32) {
        require(stakes[msg.sender] >= MIN_STAKE, "Must stake first");
        
        bytes32 submissionId = keccak256(abi.encodePacked(msg.sender, proofHash, block.number));
        
        submissions[submissionId] = MiningSubmission({
            miner: msg.sender,
            proofHash: proofHash,
            blockNumber: block.number,
            challenged: false,
            accepted: false
        });
        
        emit ProofSubmitted(submissionId, msg.sender, proofHash);
        return submissionId;
    }
    
    function challengeProof(bytes32 submissionId) external {
        MiningSubmission storage submission = submissions[submissionId];
        require(submission.miner != address(0), "Not found");
        require(!submission.challenged, "Already challenged");
        require(!submission.accepted, "Already accepted");
        require(block.number <= submission.blockNumber + CHALLENGE_WINDOW, "Window closed");
        
        submission.challenged = true;
        emit ChallengeRaised(submissionId, msg.sender);
    }
    
    function resolveChallenge(bytes32 submissionId, bool minerHonest) external {
        MiningSubmission storage submission = submissions[submissionId];
        require(submission.challenged, "Not challenged");
        require(!submission.accepted, "Already resolved");
        
        submission.accepted = true;
        
        if (minerHonest) {
            reputation[submission.miner]++;
        } else {
            reputation[submission.miner]--;
            emit MinerSlashed(submission.miner, MIN_STAKE);
        }
        
        emit ChallengeResolved(submissionId, minerHonest);
    }
    
    function isWithinChallengeWindow(bytes32 submissionId) external view returns (bool) {
        MiningSubmission storage submission = submissions[submissionId];
        if (submission.accepted || submission.challenged) return false;
        return block.number <= submission.blockNumber + CHALLENGE_WINDOW;
    }
    
    function getMinerReputation(address miner) external view returns (int256) {
        return reputation[miner];
    }
}