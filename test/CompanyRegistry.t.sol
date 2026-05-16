// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/CompanyRegistry.sol";

contract CompanyRegistryTest is Test {
    CompanyRegistry public registry;
    address public company1 = address(0x100);
    address public company2 = address(0x200);
    
    function setUp() public {
        registry = new CompanyRegistry();
    }
    
    function testRegisterCompany() public {
        vm.prank(company1);
        registry.register("OpenAI", bytes32(uint256(1)));
        
        (string memory name, bytes32 pubKey, address wallet, bool verified, , , ) = registry.companies(company1);
        assertEq(name, "OpenAI");
        assertEq(wallet, company1);
        assertEq(verified, false);
        assertEq(registry.totalRegistered(), 1);
    }
    
    function testVerifyCompany() public {
        vm.prank(company1);
        registry.register("Google AI", bytes32(uint256(2)));
        registry.verify(company1);
        (, , , bool verified, , , ) = registry.companies(company1);
        assertEq(verified, true);
    }
    
    function testCannotRegisterTwice() public {
        vm.prank(company1);
        registry.register("First", bytes32(uint256(1)));
        vm.prank(company1);
        vm.expectRevert("Already registered");
        registry.register("Second", bytes32(uint256(2)));
    }
    
    function testEarningsTracking() public {
        vm.prank(company1);
        registry.register("DeepMind", bytes32(uint256(3)));
        registry.addEarnings(company1, 1000);
        (, , , , , uint256 earned, ) = registry.companies(company1);
        assertEq(earned, 1000);
    }
    
    function testMultipleCompanies() public {
        vm.prank(company1);
        registry.register("Alpha", bytes32(uint256(1)));
        vm.prank(company2);
        registry.register("Beta", bytes32(uint256(2)));
        assertEq(registry.totalRegistered(), 2);
        assertEq(registry.getCompanyCount(), 2);
    }
    
    function testDeregister() public {
        vm.prank(company1);
        registry.register("Temp", bytes32(uint256(1)));
        assertEq(registry.totalRegistered(), 1);
        vm.prank(company1);
        registry.deregister();
        assertEq(registry.totalRegistered(), 0);
    }
    
    function testPriceUpdate() public {
        vm.prank(company1);
        registry.register("Priced", bytes32(uint256(1)));
        vm.prank(company1);
        registry.updatePrice(0.01 * 10**9);
        assertEq(registry.companyPrices(company1), 0.01 * 10**9);
    }
}