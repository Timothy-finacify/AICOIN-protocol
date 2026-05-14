// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AICOIN.sol";
import "../src/HalvingController.sol";
import "../src/Treasury.sol";

contract AICOINTest is Test {
    AICOIN public aicoin;
    HalvingController public halving;
    Treasury public treasury;
    address public user1 = address(1);
    
    function setUp() public {
        halving = new HalvingController();
        treasury = new Treasury(address(halving));
        aicoin = new AICOIN();
    }
    
    function testBurnOnTransfer() public {
        uint256 amount = 100 * 10**9;
        aicoin.transfer(user1, amount);
        
        assertEq(aicoin.balanceOf(user1), 80 * 10**9);
        assertEq(aicoin.balanceOf(address(0x000000000000000000000000000000000000dEaD)), 20 * 10**9);
        assertEq(aicoin.totalBurned(), 20 * 10**9);
    }
    
    function testTreasuryInitialFee() public {
        uint256 fee = treasury.getCurrentFee();
        assertEq(fee, 34); // 0.34%
    }
    
    function testTreasuryHalving() public {
        // Initial fee
        assertEq(treasury.getCurrentFee(), 34);
        
        // Execute first halving
        vm.roll(block.number + halving.HALVING_INTERVAL());
        halving.checkAndExecuteHalving();
        
        // Fee should halve to 17 (0.17%)
        uint256 fee = treasury.getCurrentFee();
        assertEq(fee, 17);
    }
}