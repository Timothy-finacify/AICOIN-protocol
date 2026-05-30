// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/AICOIN.sol";
import "../contracts/CompanyRegistry.sol";

contract CompanyRegistryTest is Test {
    AICOIN public token;
    CompanyRegistry public registry;
    address public company = address(20);
    uint256 public constant MIN_STAKE = 10000 * 10**9;

    function setUp() public {
        token = new AICOIN();
        registry = new CompanyRegistry(address(token));
        token.transfer(company, MIN_STAKE * 2);
        vm.prank(company);
        token.approve(address(registry), MIN_STAKE);
    }

    function testRegister() public {
        vm.prank(company);
        registry.register("TestAI", keccak256("key"), address(0), "ipfs://test", bytes32(0), 1000, MIN_STAKE);
        assertTrue(registry.isRegistered(company));
    }

    function testCannotDoubleRegister() public {
        vm.startPrank(company);
        registry.register("TestAI", keccak256("key"), address(0), "ipfs://test", bytes32(0), 1000, MIN_STAKE);
        vm.expectRevert();
        registry.register("TestAI2", keccak256("key2"), address(0), "ipfs://test2", bytes32(0), 1000, MIN_STAKE);
        vm.stopPrank();
    }

    function testTrustScoreStartsAtZero() public {
        vm.prank(company);
        registry.register("TestAI", keccak256("key"), address(0), "ipfs://test", bytes32(0), 1000, MIN_STAKE);
        assertEq(registry.getTrustScore(company), 0);
    }
}