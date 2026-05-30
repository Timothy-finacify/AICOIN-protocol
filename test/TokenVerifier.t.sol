// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/TokenVerifier.sol";

contract TokenVerifierTest is Test {
    TokenVerifier public verifier;
    address public verifierAddr = address(10);
    bytes32 public requestId = keccak256("request-1");

    function setUp() public {
        verifier = new TokenVerifier(address(this));
        verifier.setAuthorizedVerifier(verifierAddr, true);
    }

    function testVerificationNoCorrection() public {
        vm.prank(verifierAddr);
        (bool corrected, int256 adj) = verifier.verifyTokenCount(
            requestId, address(1), address(2), 1000, 1020, 1
        );
        assertFalse(corrected);
        assertEq(adj, 0);
    }

    function testCannotVerifyTwice() public {
        vm.startPrank(verifierAddr);
        verifier.verifyTokenCount(requestId, address(1), address(2), 1000, 1000, 1);
        vm.expectRevert();
        verifier.verifyTokenCount(requestId, address(1), address(2), 1000, 1000, 1);
        vm.stopPrank();
    }

    function testUnauthorizedVerifier() public {
        vm.prank(address(99));
        vm.expectRevert();
        verifier.verifyTokenCount(requestId, address(1), address(2), 1000, 1000, 1);
    }
}