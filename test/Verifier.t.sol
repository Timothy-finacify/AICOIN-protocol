// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Verifier.sol";

contract VerifierTest is Test {
    Verifier public verifier;
    address public miner = address(0x100);
    address public challenger = address(0x200);
    
    function setUp() public {
        verifier = new Verifier();
        vm.deal(miner, 10 ether);
    }
    
    function testStaking() public {
        vm.prank(miner);
        verifier.stake{value: 1000 * 10**9}();
        assertEq(verifier.stakes(miner), 1000 * 10**9);
    }
    
    function testSubmitProof() public {
        vm.prank(miner);
        verifier.stake{value: 1000 * 10**9}();
        
        vm.prank(miner);
        bytes32 submissionId = verifier.submitProof(keccak256("proof"));
        
        (address subMiner, bytes32 storedHash, , , ) = verifier.submissions(submissionId);
        assertEq(subMiner, miner);
        assertEq(storedHash, keccak256("proof"));
    }
    
    function testChallengeWindow() public {
        vm.prank(miner);
        verifier.stake{value: 1000 * 10**9}();
        
        vm.prank(miner);
        bytes32 submissionId = verifier.submitProof(keccak256("proof"));
        
        assertTrue(verifier.isWithinChallengeWindow(submissionId));
        
        vm.roll(block.number + 25);
        assertFalse(verifier.isWithinChallengeWindow(submissionId));
    }
    
    function testChallenge() public {
        vm.prank(miner);
        verifier.stake{value: 1000 * 10**9}();
        
        vm.prank(miner);
        bytes32 submissionId = verifier.submitProof(keccak256("proof"));
        
        vm.prank(challenger);
        verifier.challengeProof(submissionId);
        
        (, , , bool challenged, ) = verifier.submissions(submissionId);
        assertTrue(challenged);
    }
    
    function testSlashing() public {
        vm.prank(miner);
        verifier.stake{value: 1000 * 10**9}();
        
        vm.prank(miner);
        bytes32 submissionId = verifier.submitProof(keccak256("bad proof"));
        
        vm.prank(challenger);
        verifier.challengeProof(submissionId);
        
        verifier.resolveChallenge(submissionId, false);
        
        assertEq(verifier.getMinerReputation(miner), -1);
    }
}