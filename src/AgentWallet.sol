// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAICoinToken {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract AgentWallet {
    address public owner;
    address public aicoinToken;
    
    struct AgentConfig {
        uint256 balance;
        uint256 minBalance;
        uint256 refillAmount;
        address businessOwner;
        bool active;
        uint256 totalSpent;
        uint256 totalTransactions;
    }
    
    mapping(address => AgentConfig) public agents;
    mapping(address => address[]) public businessAgents;
    
    event AgentCreated(address indexed agent, address indexed business, uint256 minBalance, uint256 refillAmount);
    event AgentSpent(address indexed agent, address indexed service, uint256 amount, uint256 newBalance);
    event AgentRefilled(address indexed agent, uint256 amount, uint256 newBalance);
    event AgentDeactivated(address indexed agent);
    event AgentActivated(address indexed agent);
    
    constructor(address _aicoinToken) {
        owner = msg.sender;
        aicoinToken = _aicoinToken;
    }
    
    function createAgent(address agentWallet, uint256 _minBalance, uint256 _refillAmount) external {
        require(agents[agentWallet].businessOwner == address(0), "Agent already exists");
        require(_refillAmount > _minBalance, "Refill must exceed min balance");
        
        agents[agentWallet] = AgentConfig({
            balance: 0,
            minBalance: _minBalance,
            refillAmount: _refillAmount,
            businessOwner: msg.sender,
            active: true,
            totalSpent: 0,
            totalTransactions: 0
        });
        
        businessAgents[msg.sender].push(agentWallet);
        emit AgentCreated(agentWallet, msg.sender, _minBalance, _refillAmount);
    }
    
    function depositToAgent(address agentWallet, uint256 amount) external {
        AgentConfig storage agent = agents[agentWallet];
        require(agent.businessOwner == msg.sender, "Not agent owner");
        require(agent.active, "Agent not active");
        
        IAICoinToken(aicoinToken).transferFrom(msg.sender, address(this), amount);
        agent.balance += amount;
    }
    
    function spendFromAgent(address agentWallet, address service, uint256 amount) external {
        AgentConfig storage agent = agents[agentWallet];
        require(agent.active, "Agent not active");
        require(agent.balance >= amount, "Insufficient agent balance");
        
        agent.balance -= amount;
        agent.totalSpent += amount;
        agent.totalTransactions++;
        
        IAICoinToken(aicoinToken).transfer(service, amount);
        
        emit AgentSpent(agentWallet, service, amount, agent.balance);
        
        if (agent.balance < agent.minBalance) {
            _autoRefill(agentWallet);
        }
    }
    
    function _autoRefill(address agentWallet) internal {
        AgentConfig storage agent = agents[agentWallet];
        uint256 refillNeeded = agent.refillAmount;
        
        IAICoinToken(aicoinToken).transferFrom(agent.businessOwner, address(this), refillNeeded);
        agent.balance += refillNeeded;
        
        emit AgentRefilled(agentWallet, refillNeeded, agent.balance);
    }
    
    function deactivateAgent(address agentWallet) external {
        AgentConfig storage agent = agents[agentWallet];
        require(agent.businessOwner == msg.sender, "Not agent owner");
        agent.active = false;
        emit AgentDeactivated(agentWallet);
    }
    
    function activateAgent(address agentWallet) external {
        AgentConfig storage agent = agents[agentWallet];
        require(agent.businessOwner == msg.sender, "Not agent owner");
        agent.active = true;
        emit AgentActivated(agentWallet);
    }
    
    function getAgentConfig(address agentWallet) external view returns (AgentConfig memory) {
        return agents[agentWallet];
    }
    
    function getBusinessAgents(address business) external view returns (address[] memory) {
        return businessAgents[business];
    }
} 