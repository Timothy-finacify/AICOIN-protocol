// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/AICOIN.sol";
import "../contracts/Treasury.sol";

contract TreasuryTest is Test {
    AICOIN public token;
    Treasury public treasury;
    address public halvingController = address(20);
    
    function setUp() public {
        token = new AICOIN();
        treasury = new Treasury(address(token), halvingController);
    }
    
    function testInitialFee() public view {
        assertEq(treasury.INITIAL_TREASURY_FEE(), 110);
    }
    
    function testValidatorFeeFixed() public view {
        assertEq(treasury.getValidatorFee(), 40);
    }
    
    function testCollect() public {
        uint256 amount = 1000 * 10**9;
        token.transfer(address(treasury), amount);
        treasury.collect(address(this), amount);
        assertEq(treasury.totalCollected(), amount);
    }
    
    function testWithdrawOnlyOwner() public {
        token.transfer(address(treasury), 500 * 10**9);
        treasury.collect(address(this), 500 * 10**9);
        
        vm.prank(address(99));
        vm.expectRevert();
        treasury.withdraw(address(99), 100, "test");
    }
}