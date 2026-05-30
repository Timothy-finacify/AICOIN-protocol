// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/AICOIN.sol";
import "../contracts/PaymentRouter.sol";

contract PaymentRouterTest is Test {
    AICOIN public token;
    PaymentRouter public router;
    
    address public treasury = address(10);
    address public validatorPool = address(11);
    address public gasFund = address(12);
    address public companyRegistry = address(13);
    address public modelRegistry = address(14);
    
    function setUp() public {
        token = new AICOIN();
        router = new PaymentRouter(
            treasury, validatorPool, gasFund,
            companyRegistry, modelRegistry, address(token)
        );
    }
    
    function testVersion() public view {
        assertEq(router.VERSION(), "2.0.0");
    }
    
    function testDistributionMath() public pure {
        uint256 amount = 10000;
        uint256 burn = (amount * 20) / 100;
        uint256 treasuryAmt = (amount * 110) / 10000;
        uint256 validatorAmt = (amount * 40) / 10000;
        uint256 gasAmt = (amount * 800) / 10000;
        uint256 companyAmt = amount - burn - treasuryAmt - validatorAmt - gasAmt;
        
        assertEq(burn, 2000);
        assertEq(treasuryAmt, 110);
        assertEq(validatorAmt, 40);
        assertEq(gasAmt, 800);
        assertEq(companyAmt, 7050);
    }
    
    function testPause() public {
        router.pause();
        assertTrue(router.paused());
    }
    
    function testUnpause() public {
        router.pause();
        router.unpause();
        assertFalse(router.paused());
    }
} 