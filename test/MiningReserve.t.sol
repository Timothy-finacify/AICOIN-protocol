// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/AICOIN.sol";
import "../contracts/MiningReserve.sol";

contract MiningReserveTest is Test {
    AICOIN public token;
    MiningReserve public reserve;
    address public validatorPool = address(10);
    address public halvingController = address(20);
    
    function setUp() public {
        token = new AICOIN();
        reserve = new MiningReserve(address(token), validatorPool, halvingController);
    }
    
    function testCollectFees() public {
        uint256 amount = 1000 * 10**9;
        token.transfer(address(reserve), amount);
        reserve.collect(amount);
        assertEq(reserve.totalReserved(), amount);
    }
    
    function testCannotReleaseBeforeMiningEnds() public {
        vm.prank(validatorPool);
        vm.expectRevert();
        reserve.releaseMonthly();
    }
}