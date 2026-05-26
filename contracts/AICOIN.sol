// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract AICOIN is ERC20, Ownable2Step {
    
    uint8 public constant DECIMALS = 9;
    uint256 public constant PREMINT_SUPPLY = 1_000_000_000 * 10**9;
    uint256 public constant MAX_SUPPLY_CAP = 2_000_000_000 * 10**9;
    uint256 public constant BURN_PERCENT = 20;
    uint256 public constant MAX_TRANSFER = 10_000_000 * 10**9;
    uint256 public constant MINIMUM_BURN = 10;
    uint256 public constant MILESTONE_INTERVAL = 10_000_000 * 10**9;
    string public constant VERSION = "3.0.0";
    
    address public minter;
    uint256 public totalBurned;
    uint256 public lastMilestone;
    
    event TokensBurned(uint256 amount);
    event BurnMilestone(uint256 totalBurned, uint256 milestoneNumber);
    event MinterUpdated(address indexed oldMinter, address indexed newMinter);
    event VersionDeployed(string version, uint256 timestamp);
    
    error AIC__NotMinter();
    error AIC__CapExceeded();
    error AIC__ExceedsMaxTransfer();
    error AIC__InsufficientBalance();
    
    constructor() ERC20("AICOIN", "AIC") Ownable(msg.sender) {
        _mint(msg.sender, PREMINT_SUPPLY);
        minter = msg.sender;
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    function decimals() public view virtual override returns (uint8) {
        return DECIMALS;
    }
    
    function circulatingSupply() public view returns (uint256) {
        return totalSupply() - totalBurned;
    }
    
    function setMinter(address newMinter) external onlyOwner {
        address oldMinter = minter;
        minter = newMinter;
        emit MinterUpdated(oldMinter, newMinter);
    }
    
    function mint(address to, uint256 amount) external {
        if (msg.sender != minter) revert AIC__NotMinter();
        if (totalSupply() + amount > MAX_SUPPLY_CAP) revert AIC__CapExceeded();
        _mint(to, amount);
    }
    
    function _update(address from, address to, uint256 value) internal virtual override {
        if (from == address(0) || to == address(0)) {
            super._update(from, to, value);
            return;
        }
        
        if (value > MAX_TRANSFER) revert AIC__ExceedsMaxTransfer();
        
        uint256 burnAmount = (value * BURN_PERCENT) / 100;
        if (burnAmount < MINIMUM_BURN && value > 0) burnAmount = MINIMUM_BURN;
        if (burnAmount > value) burnAmount = value;
        
        uint256 sendAmount = value - burnAmount;
        
        super._update(from, address(0), burnAmount);
        super._update(from, to, sendAmount);
        
        totalBurned += burnAmount;
        emit TokensBurned(burnAmount);
        
        if (totalBurned >= lastMilestone + MILESTONE_INTERVAL) {
            lastMilestone = totalBurned;
            emit BurnMilestone(totalBurned, totalBurned / MILESTONE_INTERVAL);
        }
    }
}