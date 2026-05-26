// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract GasRelayerFund is Ownable2Step {
    
    IERC20 public immutable aicoin;
    
    uint256 public totalCollected;
    uint256 public totalSpent;
    uint256 public constant MAX_GAS_PER_TX = 5000 * 10**9; // 5000 AIC max gas refund per tx
    
    mapping(address => bool) public authorizedRelayers;
    mapping(address => uint256) public relayerRefunds;
    
    string public constant VERSION = "1.0.0";
    
    event GasFundCollected(uint256 amount);
    event GasRefunded(address indexed relayer, uint256 amount, address indexed user);
    event RelayerAuthorized(address indexed relayer, bool authorized);
    event VersionDeployed(string version, uint256 timestamp);
    
    error GF__NotAuthorized();
    error GF__TransferFailed();
    error GF__ExceedsMaxGas();
    
    modifier onlyRelayer() {
        if (!authorizedRelayers[msg.sender]) revert GF__NotAuthorized();
        _;
    }
    
    constructor(address _aicoin) Ownable(msg.sender) {
        require(_aicoin != address(0), "Zero address");
        aicoin = IERC20(_aicoin);
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    function setRelayer(address relayer, bool authorized) external onlyOwner {
        authorizedRelayers[relayer] = authorized;
        emit RelayerAuthorized(relayer, authorized);
    }
    
    function collect(uint256 amount) external {
        totalCollected += amount;
        emit GasFundCollected(amount);
    }
    
    function refundGas(address user, uint256 gasCostInAIC) external onlyRelayer returns (bool) {
        if (gasCostInAIC > MAX_GAS_PER_TX) revert GF__ExceedsMaxGas();
        
        totalSpent += gasCostInAIC;
        relayerRefunds[msg.sender] += gasCostInAIC;
        
        bool success = aicoin.transfer(msg.sender, gasCostInAIC);
        if (!success) revert GF__TransferFailed();
        
        emit GasRefunded(msg.sender, gasCostInAIC, user);
        return true;
    }
    
    function getBalance() external view returns (uint256) {
        return aicoin.balanceOf(address(this));
    }
    
    function getAvailableGasFund() external view returns (uint256) {
        return aicoin.balanceOf(address(this));
    }
}