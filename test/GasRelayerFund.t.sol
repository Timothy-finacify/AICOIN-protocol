// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/AICOIN.sol";
import "../contracts/GasRelayerFund.sol";

contract GasRelayerFundTest is Test {
    AICOIN public token;
    GasRelayerFund public gasFund;
    address public relayer = address(10);
    address public user = address(20);
    
    function setUp() public {
        token = new AICOIN();
        gasFund = new GasRelayerFund(address(token));
        gasFund.setRelayer(relayer, true);
    }
    
    function testOnlyAuthorizedRelayer() public {
        token.transfer(address(gasFund), 500);
        gasFund.collect(400);
        
        vm.prank(address(99));
        vm.expectRevert();
        gasFund.refundGas(user, 10);
    }
    
    function testRefundGas() public {
    uint256 sendAmount = 1000;
    uint256 received = (sendAmount * 80) / 100; // 800
    
    token.transfer(address(gasFund), sendAmount);
    gasFund.collect(received);
    
    uint256 balanceBefore = token.balanceOf(relayer);
    uint256 refundAmount = 50;
    uint256 expectedReceived = (refundAmount * 80) / 100; // 40 after burn
    
    vm.prank(relayer);
    gasFund.refundGas(user, refundAmount);
    
    assertEq(token.balanceOf(relayer), balanceBefore + expectedReceived);
}
}