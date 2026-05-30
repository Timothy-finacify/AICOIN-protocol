// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/AICOIN.sol";
import "../contracts/Verifier.sol";

contract VerifierTest is Test {
    AICOIN public token;
    Verifier public verifier;
    address public miner = address(10);
    uint256 public constant MIN_STAKE = 10000 * 10**9;

    function setUp() public {
        token = new AICOIN();
        verifier = new Verifier(address(token));
        token.transfer(miner, MIN_STAKE * 2);
        vm.prank(miner);
        token.approve(address(verifier), MIN_STAKE);
    }

    function testStake() public {
        vm.prank(miner);
        verifier.stake(MIN_STAKE);
        
        (uint256 stakeAmt, , , , ) = verifier.getMinerStatus(miner);
        assertEq(stakeAmt, MIN_STAKE);
    }

    function testSubmitProof() public {
        vm.prank(miner);
        verifier.stake(MIN_STAKE);
        
        bytes32 proofHash = keccak256("test-proof");
        vm.prank(miner);
        bytes32 id = verifier.submitProof(proofHash);
        assertTrue(id != bytes32(0));
    }

    function testCannotStakeBelowMinimum() public {
        vm.prank(miner);
        vm.expectRevert();
        verifier.stake(100);
    }

    function testPenalizeMiner() public {
        vm.prank(miner);
        verifier.stake(MIN_STAKE);
        
        verifier.penalizeMiner(miner, "bad proof");
        (uint256 stakeAfter, int256 rep, bool banned, , ) = verifier.getMinerStatus(miner);
        assertLt(stakeAfter, MIN_STAKE);
        assertLt(rep, 0);
    }
}