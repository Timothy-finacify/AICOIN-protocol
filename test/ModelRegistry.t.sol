// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/AICOIN.sol";
import "../contracts/ModelRegistry.sol";

contract ModelRegistryTest is Test {
    AICOIN public token;
    ModelRegistry public registry;
    address public company = address(20);
    address public companyRegistry;

    function setUp() public {
        token = new AICOIN();
        companyRegistry = address(this);
        registry = new ModelRegistry(address(token), companyRegistry, address(99));
    }

    function testCategoryPriceRange() public view {
    ModelRegistry.CategoryPriceRange memory range = 
        registry.getCategoryPriceRange(ModelRegistry.ModelCategory(0));
    assertTrue(range.active);
    assertGt(range.maxInputPricePer1M, range.minInputPricePer1M);
    assertGt(range.maxOutputPricePer1M, range.minOutputPricePer1M);
}

    function testModelCount() public view {
        assertEq(registry.getModelCount(), 0);
    }
}