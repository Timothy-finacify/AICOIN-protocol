// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/AICOIN.sol";
import "../contracts/AgentWallet.sol";

contract AgentWalletTest is Test {
    AICOIN public token;
    AgentWallet public wallet;
    address public business = address(10);
    address public agent = address(20);
    address public companyRegistry;

    function setUp() public {
        token = new AICOIN();
        companyRegistry = address(this);
        wallet = new AgentWallet(address(token), address(this), companyRegistry);
    }

    function testCreateAgent() public {
        vm.prank(business);
        wallet.createAgent(agent, 50, 200);
        
        AgentWallet.AgentConfig memory config = wallet.getAgentConfig(agent);
        assertTrue(config.active);
        assertEq(config.businessOwner, business);
    }

    function testCannotCreateDuplicateAgent() public {
        vm.startPrank(business);
        wallet.createAgent(agent, 50, 200);
        vm.expectRevert();
        wallet.createAgent(agent, 50, 200);
        vm.stopPrank();
    }
} 