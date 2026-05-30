// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract MultiModelRouter is Ownable2Step {
    
    struct ProviderInfo {
        string name;
        string endpointURI;
        bool active;
        uint256 totalRequests;
        uint256 totalTokensServed;
    }
    
    struct ModelRoute {
        bytes32 modelId;
        address provider;
        uint8 category;
        bool active;
    }
    
    mapping(address => ProviderInfo) public providers;
    mapping(bytes32 => ModelRoute) public routes;
    mapping(uint8 => bytes32[]) public modelsByCategory;
    mapping(address => bytes32[]) public providerModels;
    
    address public modelRegistry;
    uint256 public totalRoutes;
    
    string public constant VERSION = "1.0.0";
    
    event ProviderRegistered(address indexed provider, string name, string endpointURI);
    event RouteAdded(bytes32 indexed modelId, address indexed provider, uint8 category);
    event RouteRemoved(bytes32 indexed modelId);
    event ModelRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);
    event VersionDeployed(string version, uint256 timestamp);
    
    error MMR__ProviderExists();
    error MMR__ProviderNotFound();
    error MMR__RouteExists();
    error MMR__RouteNotFound();
    error MMR__ZeroAddress();
    
    constructor(address _modelRegistry) Ownable(msg.sender) {
        if (_modelRegistry == address(0)) revert MMR__ZeroAddress();
        modelRegistry = _modelRegistry;
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    function setModelRegistry(address _mr) external onlyOwner {
        emit ModelRegistryUpdated(modelRegistry, _mr);
        modelRegistry = _mr;
    }
    
    function registerProvider(string calldata _name, string calldata _endpointURI) external {
        if (providers[msg.sender].active) revert MMR__ProviderExists();
        providers[msg.sender] = ProviderInfo(_name, _endpointURI, true, 0, 0);
        emit ProviderRegistered(msg.sender, _name, _endpointURI);
    }
    
    function addRoute(bytes32 _modelId, uint8 _category) external {
        if (routes[_modelId].active) revert MMR__RouteExists();
        routes[_modelId] = ModelRoute(_modelId, msg.sender, _category, true);
        modelsByCategory[_category].push(_modelId);
        providerModels[msg.sender].push(_modelId);
        totalRoutes++;
        emit RouteAdded(_modelId, msg.sender, _category);
    }
    
    function removeRoute(bytes32 _modelId) external {
        ModelRoute storage route = routes[_modelId];
        if (route.provider != msg.sender) revert MMR__RouteNotFound();
        route.active = false;
        emit RouteRemoved(_modelId);
    }
    
    function getProviderForModel(bytes32 _modelId) external view returns (address provider, string memory endpointURI) {
        ModelRoute storage route = routes[_modelId];
        ProviderInfo storage info = providers[route.provider];
        return (route.provider, info.endpointURI);
    }
    
    function getModelsByCategory(uint8 _category) external view returns (bytes32[] memory) {
        return modelsByCategory[_category];
    }
    
    function getProviderModels(address _provider) external view returns (bytes32[] memory) {
        return providerModels[_provider];
    }
}