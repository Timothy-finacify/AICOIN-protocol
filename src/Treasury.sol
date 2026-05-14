// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IHalvingController {
    function currentHalving() external view returns (uint256);
}

contract Treasury {
    address public governance;
    address public halvingController;
    uint256 public constant INITIAL_TREASURY_FEE = 34; // 0.34% in basis points
    uint256 public treasuryFee;
    uint256 public totalCollected;
    uint256 public lastHalvingApplied;
    
    event FundsReceived(address indexed from, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount, string reason);
    event TreasuryFeeUpdated(uint256 oldFee, uint256 newFee);
    event GovernanceTransferred(address indexed oldGov, address indexed newGov);
    
    constructor(address _halvingController) {
        governance = msg.sender;
        halvingController = _halvingController;
        treasuryFee = INITIAL_TREASURY_FEE;
        lastHalvingApplied = 0;
    }
    
    modifier onlyGovernance() {
        require(msg.sender == governance, "Only governance");
        _;
    }
    
    function syncWithHalving() public {
        uint256 currentHalving = IHalvingController(halvingController).currentHalving();
        
        if (currentHalving > lastHalvingApplied) {
            uint256 newFee = INITIAL_TREASURY_FEE / (2 ** currentHalving);
            
            if (newFee < 1) {
                newFee = 0;
            }
            
            uint256 oldFee = treasuryFee;
            treasuryFee = newFee;
            lastHalvingApplied = currentHalving;
            
            emit TreasuryFeeUpdated(oldFee, newFee);
        }
    }
    
    function getCurrentFee() public returns (uint256) {
        syncWithHalving();
        return treasuryFee;
    }
    
    function collect(uint256 amount) external {
        totalCollected += amount;
        emit FundsReceived(msg.sender, amount);
    }
    
    function withdraw(address to, uint256 amount, string calldata reason) external onlyGovernance {
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        emit FundsWithdrawn(to, amount, reason);
    }
    
    function transferGovernance(address newGovernance) external onlyGovernance {
        require(newGovernance != address(0), "Invalid address");
        address oldGov = governance;
        governance = newGovernance;
        emit GovernanceTransferred(oldGov, newGovernance);
    }
}