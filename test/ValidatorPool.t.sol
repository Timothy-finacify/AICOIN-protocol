// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/AICOIN.sol";
import "../contracts/ValidatorPool.sol";

contract ValidatorPoolTest is Test {
    AICOIN public token;
    ValidatorPool public pool;
    address public validator = address(30);
    address public halvingController;
    uint256 public constant MIN_STAKE = 1000 * 10**9;

    function setUp() public {
        token = new AICOIN();
        halvingController = address(this);
        pool = new ValidatorPool(address(token), halvingController);
        token.transfer(validator, MIN_STAKE * 2);
        vm.prank(validator);
        token.approve(address(pool), MIN_STAKE);
    }

    function testStake() public {
        vm.prank(validator);
        pool.stake(MIN_STAKE);
        
        (uint256 staked, , bool active) = pool.getValidatorInfo(validator);
        assertGt(staked, 0);
        assertTrue(active);
    }

    function testCollectFees() public {
        token.transfer(address(pool), 500);
        pool.collect(400);
        assertEq(pool.totalFeesCollected(), 400);
    }
    
    function testValidatorCount() public {
        vm.prank(validator);
        pool.stake(MIN_STAKE);
        assertEq(pool.getValidatorCount(), 1);
    }
}