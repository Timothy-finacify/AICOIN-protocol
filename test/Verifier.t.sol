// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

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
        assertEq(verifier.getStakeAmount(miner), 1000 * 10**9);
    }
    
    function testSubmitProof() public {
        vm.prank(miner);
        verifier.stake{value: 1000 * 10**9}();
        
        vm.prank(miner);
        bytes32 submissionId = verifier.submitProof(keccak256("proof"));
        // Proof submitted successfully if no revert
        assertTrue(submissionId != bytes32(0));
    }
    
    function testPenalizeMiner() public {
        vm.prank(miner);
        verifier.stake{value: 1000 * 10**9}();
        
        verifier.penalizeMiner(miner, "Fraudulent proof");
        
        assertEq(verifier.getMinerReputation(miner), -10);
        assertEq(verifier.getOffenseCount(miner), 1);
    }
    
    function testOffenseHistory() public {
        vm.prank(miner);
        verifier.stake{value: 1000 * 10**9}();
        
        verifier.penalizeMiner(miner, "First fraud");
        
        Verifier.Offense[] memory history = verifier.getOffenseHistory(miner);
        assertEq(history.length, 1);
        assertEq(history[0].slashPercent, 50);
    }
    
    function testSecondOffenseBan() public {
        vm.prank(miner);
        verifier.stake{value: 1000 * 10**9}();
        
        verifier.penalizeMiner(miner, "First fraud");
        verifier.penalizeMiner(miner, "Second fraud");
        
        assertEq(verifier.isMinerBanned(miner), true);
        assertEq(verifier.getMinerReputation(miner), -20);
        assertEq(verifier.getOffenseCount(miner), 2);
    }
}