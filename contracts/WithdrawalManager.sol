// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ICompanyRegistry {
    function isRegistered(address company) external view returns (bool);
}

contract WithdrawalManager is Ownable2Step, ReentrancyGuard {
    
    struct Withdrawal {
        address recipient;
        uint256 amount;
        string reason;
        uint256 timestamp;
        bool executed;
    }
    
    IERC20 public immutable aicoin;
    ICompanyRegistry public immutable companyRegistry;
    
    mapping(address => uint256) public pendingWithdrawals;
    mapping(address => Withdrawal[]) public withdrawalHistory;
    
    uint256 public constant MIN_WITHDRAWAL = 10 * 10**9;
    uint256 public constant MAX_WITHDRAWAL = 1_000_000 * 10**9;
    uint256 public totalWithdrawn;
    
    string public constant VERSION = "1.0.0";
    
    event WithdrawalRequested(address indexed company, uint256 amount, string reason);
    event WithdrawalExecuted(address indexed company, address indexed recipient, uint256 amount);
    event VersionDeployed(string version, uint256 timestamp);
    
    error WM__NotRegisteredCompany();
    error WM__BelowMinimum();
    error WM__AboveMaximum();
    error WM__InsufficientBalance();
    error WM__TransferFailed();
    error WM__ZeroAddress();
    
    modifier onlyRegisteredCompany() {
        if (!companyRegistry.isRegistered(msg.sender)) revert WM__NotRegisteredCompany();
        _;
    }
    
    constructor(address _aicoin, address _companyRegistry) Ownable(msg.sender) {
        if (_aicoin == address(0) || _companyRegistry == address(0)) revert WM__ZeroAddress();
        aicoin = IERC20(_aicoin);
        companyRegistry = ICompanyRegistry(_companyRegistry);
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    function requestWithdrawal(uint256 _amount, string calldata _reason) external onlyRegisteredCompany {
        if (_amount < MIN_WITHDRAWAL) revert WM__BelowMinimum();
        if (_amount > MAX_WITHDRAWAL) revert WM__AboveMaximum();
        pendingWithdrawals[msg.sender] += _amount;
        emit WithdrawalRequested(msg.sender, _amount, _reason);
    }
    
    function executeWithdrawal(address _recipient, uint256 _amount) external onlyRegisteredCompany nonReentrant {
        if (_recipient == address(0)) revert WM__ZeroAddress();
        if (_amount > pendingWithdrawals[msg.sender]) revert WM__InsufficientBalance();
        pendingWithdrawals[msg.sender] -= _amount;
        bool success = aicoin.transfer(_recipient, _amount);
        if (!success) revert WM__TransferFailed();
        withdrawalHistory[msg.sender].push(Withdrawal(_recipient, _amount, "", block.timestamp, true));
        totalWithdrawn += _amount;
        emit WithdrawalExecuted(msg.sender, _recipient, _amount);
    }
    
    function getPendingWithdrawal(address _company) external view returns (uint256) {
        return pendingWithdrawals[_company];
    }
    
    function getWithdrawalHistory(address _company) external view returns (Withdrawal[] memory) {
        return withdrawalHistory[_company];
    }
}