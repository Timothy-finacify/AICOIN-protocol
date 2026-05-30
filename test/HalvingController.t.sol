// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/HalvingController.sol";

contract HalvingControllerTest is Test {
    HalvingController public controller;
    address public aicoin = address(10);
    address public validatorPool = address(11);
    
    function setUp() public {
        controller = new HalvingController(aicoin, validatorPool);
    }
    
    function testInitialReward() public view {
        assertEq(controller.getCurrentReward(), 10 * 10**9);
    }
    
    function testMiningActive() public view {
        assertTrue(controller.miningActive());
    }
    
    function testBlocksUntilHalving() public view {
        assertTrue(controller.blocksUntilHalving() > 0);
    }
    
    function testCannotHalveTooEarly() public {
        vm.expectRevert();
        controller.checkAndExecuteHalving();
    }
} 