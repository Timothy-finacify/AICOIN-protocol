// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/HalvingController.sol";

contract HalvingControllerTest is Test {
    HalvingController public halving;
    
    function setUp() public {
        halving = new HalvingController();
    }
    
    function testInitialState() public {
        assertEq(halving.currentHalving(), 0);
        assertEq(halving.blockReward(), 100 * 10**9);
        assertEq(halving.miningActive(), true);
    }
    
    function testHalvingExecutes() public {
        uint256 initialReward = halving.blockReward();
        assertEq(initialReward, 100 * 10**9);
        
        // Fast forward past halving block
        vm.roll(block.number + halving.HALVING_INTERVAL());
        
        halving.checkAndExecuteHalving();
        
        assertEq(halving.currentHalving(), 1);
        assertEq(halving.blockReward(), 50 * 10**9);
    }
    
    function testMiningEnds() public {
        // Fast forward past all 34 halvings
        vm.roll(block.number + (halving.HALVING_INTERVAL() * 35));
        
        // Execute all halvings
        for (uint256 i = 0; i < 34; i++) {
            halving.checkAndExecuteHalving();
            vm.roll(block.number + halving.HALVING_INTERVAL());
        }
        
        assertEq(halving.miningActive(), false);
        assertEq(halving.blockReward(), 0);
    }
}
