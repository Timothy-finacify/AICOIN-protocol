 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

interface IPaymentRouter {
    function routePayment(
        address company, bytes32 modelId, uint256 inputTokens, 
        uint256 outputTokens, address payer
    ) external returns (bool);
}

interface ICompanyRegistry {
    function isRegistered(address company) external view returns (bool);
}

/// @title AgentWallet — Multi-Provider AI Agent Wallet with Auto-Refill
/// @notice Businesses create agent wallets that auto-pay for AI services.
/// @dev Supports MetaMask, WalletConnect, Coinbase Wallet, and any EIP-712 wallet.
contract AgentWallet is Ownable2Step, ReentrancyGuard, EIP712 {
    using ECDSA for bytes32;
    
    // ============ STRUCTS ============
    
    struct AgentConfig {
        uint256 balance;
        uint256 minBalance;
        uint256 refillAmount;
        address businessOwner;
        bool active;
        uint256 totalSpent;
        uint256 totalTransactions;
        uint256 createdAt;
    }
    
    struct SpendRequest {
        address agentWallet;
        address company;
        bytes32 modelId;
        uint256 inputTokens;
        uint256 outputTokens;
        uint256 nonce;
        uint256 deadline;
    }
    
    // ============ STATE ============
    
    IERC20 public immutable aicoin;
    IPaymentRouter public immutable paymentRouter;
    ICompanyRegistry public companyRegistry;
    
    mapping(address => AgentConfig) public agents;
    mapping(address => address[]) public businessAgents;
    mapping(address => uint256) public nonces;
    mapping(address => bool) public approvedWalletProvider;
    
    string public constant VERSION = "2.0.0";
    
    // ============ EVENTS ============
    
    event AgentCreated(address indexed agent, address indexed business, uint256 minBalance, uint256 refillAmount);
    event AgentSpent(address indexed agent, address indexed company, bytes32 modelId, uint256 amount, uint256 newBalance);
    event AgentRefilled(address indexed agent, uint256 amount, uint256 newBalance);
    event AgentDeactivated(address indexed agent);
    event AgentActivated(address indexed agent);
    event AgentBalanceWithdrawn(address indexed agent, address indexed to, uint256 amount);
    event WalletProviderApproved(address indexed provider, bool approved);
    event VersionDeployed(string version, uint256 timestamp);
    
    // ============ ERRORS ============
    
    error AW__AgentExists();
    error AW__AgentNotFound();
    error AW__NotAgentOwner();
    error AW__NotAgentOrOwner();
    error AW__AgentNotActive();
    error AW__InsufficientBalance();
    error AW__InvalidRefillAmount();
    error AW__InvalidSignature();
    error AW__ExpiredDeadline();
    error AW__TransferFailed();
    error AW__CompanyNotRegistered();
    error AW__ZeroAddress();
    
    // ============ MODIFIERS ============
    
    modifier agentExists(address agentWallet) {
        if (agents[agentWallet].businessOwner == address(0)) revert AW__AgentNotFound();
        _;
    }
    
    modifier onlyAgentOwner(address agentWallet) {
        if (agents[agentWallet].businessOwner != msg.sender) revert AW__NotAgentOwner();
        _;
    }
    
    modifier onlyAgentOrOwner(address agentWallet) {
        AgentConfig storage agent = agents[agentWallet];
        if (msg.sender != agentWallet && msg.sender != agent.businessOwner) revert AW__NotAgentOrOwner();
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor(address _aicoin, address _paymentRouter, address _companyRegistry) 
        Ownable(msg.sender) 
        EIP712("AICOIN AgentWallet", "2.0.0") 
    {
        if (_aicoin == address(0)) revert AW__ZeroAddress();
        if (_paymentRouter == address(0)) revert AW__ZeroAddress();
        if (_companyRegistry == address(0)) revert AW__ZeroAddress();
        
        aicoin = IERC20(_aicoin);
        paymentRouter = IPaymentRouter(_paymentRouter);
        companyRegistry = ICompanyRegistry(_companyRegistry);
        
        // Pre-approve common wallet providers
        approvedWalletProvider[msg.sender] = true;
        
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    // ============ WALLET PROVIDER MANAGEMENT ============
    
    function setWalletProvider(address provider, bool approved) external onlyOwner {
        approvedWalletProvider[provider] = approved;
        emit WalletProviderApproved(provider, approved);
    }
    
    function setCompanyRegistry(address _companyRegistry) external onlyOwner {
        if (_companyRegistry == address(0)) revert AW__ZeroAddress();
        companyRegistry = ICompanyRegistry(_companyRegistry);
    }
    
    // ============ AGENT CREATION ============
    
    function createAgent(
        address agentWallet,
        uint256 minBalance,
        uint256 refillAmount
    ) external {
        if (agents[agentWallet].businessOwner != address(0)) revert AW__AgentExists();
        if (refillAmount <= minBalance) revert AW__InvalidRefillAmount();
        if (agentWallet == address(0)) revert AW__ZeroAddress();
        
        agents[agentWallet] = AgentConfig({
            balance: 0,
            minBalance: minBalance,
            refillAmount: refillAmount,
            businessOwner: msg.sender,
            active: true,
            totalSpent: 0,
            totalTransactions: 0,
            createdAt: block.timestamp
        });
        
        businessAgents[msg.sender].push(agentWallet);
        
        emit AgentCreated(agentWallet, msg.sender, minBalance, refillAmount);
    }
    
    // ============ DEPOSIT (FUND AGENT) ============
    
    function depositToAgent(address agentWallet, uint256 amount) external 
        agentExists(agentWallet) 
        onlyAgentOwner(agentWallet) 
        nonReentrant 
    {
        AgentConfig storage agent = agents[agentWallet];
        if (!agent.active) revert AW__AgentNotActive();
        
        bool success = aicoin.transferFrom(msg.sender, address(this), amount);
        if (!success) revert AW__TransferFailed();
        
        agent.balance += amount;
    }
    
    // ============ SPEND (MULTI-WALLET SIGNATURE SUPPORT) ============
    
    /// @notice Spend from agent using any approved wallet provider's signature
    /// @dev Supports MetaMask, WalletConnect, Coinbase Wallet via EIP-712
    function spendFromAgent(
        SpendRequest calldata request,
        bytes calldata signature
    ) external nonReentrant agentExists(request.agentWallet) returns (bool) {
        AgentConfig storage agent = agents[request.agentWallet];
        
        // Verify the spender is the agent wallet or business owner
        address signer = _verifySpendRequest(request, signature);
        if (signer != request.agentWallet && signer != agent.businessOwner) {
            revert AW__NotAgentOrOwner();
        }
        
        if (!agent.active) revert AW__AgentNotActive();
        if (block.timestamp > request.deadline) revert AW__ExpiredDeadline();
        if (nonces[request.agentWallet] != request.nonce) revert AW__InvalidSignature();
        
        // Verify company is registered
        if (!companyRegistry.isRegistered(request.company)) revert AW__CompanyNotRegistered();
        
        // Calculate cost and verify balance
        uint256 totalCost = _estimateCost(request.inputTokens, request.outputTokens);
        if (agent.balance < totalCost) revert AW__InsufficientBalance();
        
        // Update state
        nonces[request.agentWallet]++;
        agent.balance -= totalCost;
        agent.totalSpent += totalCost;
        agent.totalTransactions++;
        
        // Approve PaymentRouter to spend from this contract
        aicoin.approve(address(paymentRouter), totalCost);
        
        // Route payment through PaymentRouter (handles burn, treasury, validators, gas fund, company)
        bool success = paymentRouter.routePayment(
            request.company,
            request.modelId,
            request.inputTokens,
            request.outputTokens,
            address(this) // payer is this contract (agent wallet contract)
        );
        if (!success) revert AW__TransferFailed();
        
        emit AgentSpent(request.agentWallet, request.company, request.modelId, totalCost, agent.balance);
        
        // Auto-refill if below minimum
        if (agent.balance < agent.minBalance) {
            _autoRefill(request.agentWallet);
        }
        
        return true;
    }
    
    /// @notice Direct spend (agent wallet itself or business owner calling directly)
    function spendFromAgentDirect(
        address agentWallet,
        address company,
        bytes32 modelId,
        uint256 inputTokens,
        uint256 outputTokens
    ) external agentExists(agentWallet) onlyAgentOrOwner(agentWallet) nonReentrant returns (bool) {
        AgentConfig storage agent = agents[agentWallet];
        
        if (!agent.active) revert AW__AgentNotActive();
        if (!companyRegistry.isRegistered(company)) revert AW__CompanyNotRegistered();
        
        uint256 totalCost = _estimateCost(inputTokens, outputTokens);
        if (agent.balance < totalCost) revert AW__InsufficientBalance();
        
        agent.balance -= totalCost;
        agent.totalSpent += totalCost;
        agent.totalTransactions++;
        
        aicoin.approve(address(paymentRouter), totalCost);
        
        bool success = paymentRouter.routePayment(
            company, modelId, inputTokens, outputTokens, address(this)
        );
        if (!success) revert AW__TransferFailed();
        
        emit AgentSpent(agentWallet, company, modelId, totalCost, agent.balance);
        
        if (agent.balance < agent.minBalance) {
            _autoRefill(agentWallet);
        }
        
        return true;
    }
    
    // ============ AUTO-REFILL ============
    
    function _autoRefill(address agentWallet) internal {
        AgentConfig storage agent = agents[agentWallet];
        uint256 refillNeeded = agent.refillAmount;
        
        bool success = aicoin.transferFrom(agent.businessOwner, address(this), refillNeeded);
        if (success) {
            agent.balance += refillNeeded;
            emit AgentRefilled(agentWallet, refillNeeded, agent.balance);
        }
        // If transferFrom fails (no allowance), agent continues with low balance
        // Next payment will fail if balance insufficient
    }
    
    function manualRefill(address agentWallet, uint256 amount) external 
        agentExists(agentWallet) 
        onlyAgentOwner(agentWallet) 
        nonReentrant 
    {
        AgentConfig storage agent = agents[agentWallet];
        
        bool success = aicoin.transferFrom(msg.sender, address(this), amount);
        if (!success) revert AW__TransferFailed();
        
        agent.balance += amount;
        emit AgentRefilled(agentWallet, amount, agent.balance);
    }
    
    // ============ AGENT LIFECYCLE ============
    
    function deactivateAgent(address agentWallet) external 
        agentExists(agentWallet) 
        onlyAgentOwner(agentWallet) 
    {
        agents[agentWallet].active = false;
        emit AgentDeactivated(agentWallet);
    }
    
    function activateAgent(address agentWallet) external 
        agentExists(agentWallet) 
        onlyAgentOwner(agentWallet) 
    {
        agents[agentWallet].active = true;
        emit AgentActivated(agentWallet);
    }
    
    function withdrawAgentBalance(address agentWallet, address to, uint256 amount) external 
        agentExists(agentWallet) 
        onlyAgentOwner(agentWallet) 
        nonReentrant 
    {
        AgentConfig storage agent = agents[agentWallet];
        if (amount > agent.balance) revert AW__InsufficientBalance();
        
        agent.balance -= amount;
        
        bool success = aicoin.transfer(to, amount);
        if (!success) revert AW__TransferFailed();
        
        emit AgentBalanceWithdrawn(agentWallet, to, amount);
    }
    
    // ============ SIGNATURE VERIFICATION ============
    
    function _verifySpendRequest(SpendRequest calldata request, bytes calldata signature) 
        internal view returns (address) 
    {
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
            keccak256(
                "SpendRequest(address agentWallet,address company,bytes32 modelId,uint256 inputTokens,uint256 outputTokens,uint256 nonce,uint256 deadline)"
            ),
            request.agentWallet,
            request.company,
            request.modelId,
            request.inputTokens,
            request.outputTokens,
            request.nonce,
            request.deadline
        )));
        
        return digest.recover(signature);
    }
    
    // ============ COST ESTIMATION ============
    
    function _estimateCost(uint256 inputTokens, uint256 outputTokens) internal pure returns (uint256) {
        // PaymentRouter queries ModelRegistry for exact cost
        // This is a fallback estimation
        return (inputTokens + outputTokens) / 1000; // Rough estimate
    }
    
    // ============ VIEWS ============
    
    function getAgentConfig(address agentWallet) external view agentExists(agentWallet) returns (AgentConfig memory) {
        return agents[agentWallet];
    }
    
    function getBusinessAgents(address business) external view returns (address[] memory) {
        return businessAgents[business];
    }
    
    function getAgentBalance(address agentWallet) external view agentExists(agentWallet) returns (uint256) {
        return agents[agentWallet].balance;
    }
    
    function getContractBalance() external view returns (uint256) {
        return aicoin.balanceOf(address(this));
    }
    
    function isApprovedProvider(address provider) external view returns (bool) {
        return approvedWalletProvider[provider];
    }
    
    // ============ RECEIVE AIC ============
    
    /// @notice Allow direct AIC transfers to this contract (for funding agents)
    function onTokenTransfer(address from, uint256 amount) external returns (bool) {
        // Can be used by PaymentRouter to return excess or by owners to fund
        return true;
    }
}