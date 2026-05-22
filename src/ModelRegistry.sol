// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICompanyRegistry {
    function companies(address wallet) external view returns (
        string memory name, bytes32 publicKey, address walletAddr,
        bool verified, uint256 registeredAt, uint256 totalEarned, uint256 gracePeriodEnd
    );
}

contract ModelRegistry {
    enum HardwareTier { MOBILE, CONSUMER_GPU, DATA_CENTER }
    
    struct ModelInfo {
        string name;
        string ipfsHash;
        address company;
        HardwareTier minTier;
        uint256 minMemoryMB;
        uint256 pricePerRequest;
        bool active;
        bool selfHosted;        // NEW: Company hosts this model themselves
        uint256 uptimePercent;  // NEW: Uptime tracking (0-100)
        uint256 totalRequests;  // NEW: Total requests served
    }
    
    struct CompanyHost {
        address companyAddress;
        uint256 stakedAmount;
        uint256 reputation;
        uint256 totalModelsHosted;
        uint256 totalRequestsServed;
        bool active;
    }
    
    address public companyRegistry;
    mapping(bytes32 => ModelInfo) public models;
    mapping(address => bytes32[]) public companyModels;
    bytes32[] public modelIds;
    
    // NEW: Company hosting
    mapping(address => CompanyHost) public companyHosts;
    address[] public hostList;
    uint256 public constant HOST_STAKE = 5000 * 10**9; // 5000 AIC
    
    event ModelRegistered(bytes32 indexed modelId, string name, address company, HardwareTier tier, bool selfHosted);
    event CompanyRegisteredAsHost(address indexed company, uint256 stake);
    event ModelRequestServed(bytes32 indexed modelId, address company, uint256 requestCount);
    
    constructor(address _companyRegistry) {
        companyRegistry = _companyRegistry;
    }
    
    // ============================================================
    // MODEL REGISTRATION (UPDATED)
    // ============================================================
    
    function registerModel(
        string calldata name,
        string calldata ipfsHash,
        HardwareTier minTier,
        uint256 minMemoryMB,
        uint256 pricePerRequest,
        bool selfHosted
    ) external returns (bytes32) {
        (string memory companyName, , , , , , ) = ICompanyRegistry(companyRegistry).companies(msg.sender);
        require(bytes(companyName).length > 0, "Company not registered on AICOIN");
        
        bytes32 modelId = keccak256(abi.encodePacked(name, msg.sender, block.timestamp));
        
        models[modelId] = ModelInfo({
            name: name,
            ipfsHash: ipfsHash,
            company: msg.sender,
            minTier: minTier,
            minMemoryMB: minMemoryMB,
            pricePerRequest: pricePerRequest,
            active: true,
            selfHosted: selfHosted,
            uptimePercent: 0,
            totalRequests: 0
        });
        
        modelIds.push(modelId);
        companyModels[msg.sender].push(modelId);
        
        emit ModelRegistered(modelId, name, msg.sender, minTier, selfHosted);
        return modelId;
    }
    
    // ============================================================
    // COMPANY HOSTING (NEW)
    // ============================================================
    
    function registerAsHost() external payable {
        require(msg.value >= HOST_STAKE, "Insufficient stake");
        require(!companyHosts[msg.sender].active, "Already registered as host");
        
        (string memory companyName, , , , , , ) = ICompanyRegistry(companyRegistry).companies(msg.sender);
        require(bytes(companyName).length > 0, "Company not registered");
        
        companyHosts[msg.sender] = CompanyHost({
            companyAddress: msg.sender,
            stakedAmount: msg.value,
            reputation: 0,
            totalModelsHosted: 0,
            totalRequestsServed: 0,
            active: true
        });
        
        hostList.push(msg.sender);
        emit CompanyRegisteredAsHost(msg.sender, msg.value);
    }
    
    function recordRequestServed(bytes32 modelId, uint256 count) external {
        ModelInfo storage model = models[modelId];
        require(model.company == msg.sender, "Not your model");
        
        model.totalRequests += count;
        
        if (companyHosts[msg.sender].active) {
            companyHosts[msg.sender].totalRequestsServed += count;
        }
        
        emit ModelRequestServed(modelId, msg.sender, count);
    }
    
    // ============================================================
    // VIEW FUNCTIONS
    // ============================================================
    
    function getModelsByCompany(address company) external view returns (bytes32[] memory) {
        return companyModels[company];
    }
    
    function getModelCount() external view returns (uint256) {
        return modelIds.length;
    }
    
    function getModel(bytes32 modelId) external view returns (ModelInfo memory) {
        return models[modelId];
    }
    
    function getSelfHostedModels() external view returns (bytes32[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < modelIds.length; i++) {
            if (models[modelIds[i]].selfHosted && models[modelIds[i]].active) {
                count++;
            }
        }
        
        bytes32[] memory result = new bytes32[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < modelIds.length; i++) {
            if (models[modelIds[i]].selfHosted && models[modelIds[i]].active) {
                result[index] = modelIds[i];
                index++;
            }
        }
        return result;
    }
    
    function getHostCount() external view returns (uint256) {
        return hostList.length;
    }
    
    function isCompanyHost(address company) external view returns (bool) {
        return companyHosts[company].active;
    }
} 