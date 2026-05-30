// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/AICOIN.sol";

contract AICOINTest is Test {
    AICOIN public token;
    address public owner = address(1);
    address public user = address(2);
    address public receiver = address(3);
    
    function setUp() public {
        vm.prank(owner);
        token = new AICOIN();
        vm.prank(owner);
        token.transfer(user, 10000 * 10**9);
    }
    
    function testName() public view {
        assertEq(token.name(), "AICOIN");
    }
    
    function testSymbol() public view {
        assertEq(token.symbol(), "AIC");
    }
    
    function testDecimals() public view {
        assertEq(token.decimals(), 9);
    }
    
 function testTotalSupply() public view {
    uint256 expectedSupply = 1_000_000_000 * 10**9 - (10000 * 10**9 * 20 / 100);
    assertEq(token.totalSupply(), expectedSupply);
}
    
    function testBurnOnTransfer() public {
        uint256 burnBefore = token.totalBurned();
        
        vm.prank(user);
        token.transfer(receiver, 100 * 10**9);
        
        uint256 expectedNewBurn = (100 * 10**9 * 20) / 100;
        assertEq(token.totalBurned(), burnBefore + expectedNewBurn);
        assertEq(token.balanceOf(receiver), 80 * 10**9);
    }
    
    function testCirculatingSupply() public {
        assertEq(token.circulatingSupply(), token.totalSupply() - token.totalBurned());
    }
    
    function testMintOnlyMinter() public {
        vm.prank(user);
        vm.expectRevert();
        token.mint(user, 100);
    }
    
    function testMintByMinter() public {
        uint256 amount = 100 * 10**9;
        uint256 supplyBefore = token.totalSupply();
        
        vm.prank(owner);
        token.mint(user, amount);
        
        assertEq(token.totalSupply(), supplyBefore + amount);
    }
}