// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/Session.sol";

contract SessionTest is Test {
    Session public session;
    address public user = address(10);
    address public dapp = address(20);

    function setUp() public {
        session = new Session(address(this));
    }

    function testApproveSession() public {
        vm.prank(user);
        session.approveSession(dapp, 500 * 10**9, 7 days);
        
        Session.SessionInfo memory info = session.getSession(user, dapp);
        assertTrue(info.active);
        assertEq(info.allowance, 500 * 10**9);
    }

    function testRevokeSession() public {
        vm.startPrank(user);
        session.approveSession(dapp, 500, 7 days);
        session.revokeSession(dapp);
        
        Session.SessionInfo memory info = session.getSession(user, dapp);
        assertFalse(info.active);
        vm.stopPrank();
    }

    function testRemainingAllowance() public {
        vm.prank(user);
        session.approveSession(dapp, 1000, 7 days);
        assertEq(session.getRemainingAllowance(user, dapp), 1000);
    }
}