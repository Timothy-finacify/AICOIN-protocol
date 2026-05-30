// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ICompanyRegistry {
    function isRegistered(address company) external view returns (bool);
    function getTrustScore(address company) external view returns (uint256);
}

interface IAICOracle {
    function getAICUsdPrice() external view returns (uint256);
    function getTWAP() external view returns (uint256);
    function lastUpdateTime() external view returns (uint256);
}

contract ModelRegistry is Ownable2Step, ReentrancyGuard {
    
    enum ModelCategory { TEXT, CODE, IMAGE, AUDIO, VIDEO, MULTIMODAL, REASONING, AGENTIC }
    enum ModelStatus { ACTIVE, INACTIVE, DEPRECATED, BANNED }
    enum HardwareTier { MOBILE, CONSUMER_GPU, DATA_CENTER, SUPERCOMPUTER }
    
    struct PricingConfig {
        uint256 inputPricePer1MTokens;
        uint256 outputPricePer1MTokens;
        bool useAutoPricing;
    }
    
    struct ModelInfo {
        string name;
        string version;
        string ipfsMetadata;
        bytes32 zkVerificationKey;
        bytes32 zkCircuitHash;
        address company;
        ModelCategory category;
        PricingConfig pricing;
        HardwareTier minHardwareTier;
        uint256 minMemoryMB;
        uint256 maxTokensPerRequest;
        uint256 totalRequestsServed;
        uint256 totalInputTokensServed;
        uint256 totalOutputTokensServed;
        uint256 registeredAt;
        uint256 lastServedAt;
        uint256 uptimePercent;
        ModelStatus status;
    }
    
    struct CategoryPriceRange {
        uint256 minInputPricePer1M;
        uint256 maxInputPricePer1M;
        uint256 minOutputPricePer1M;
        uint256 maxOutputPricePer1M;
        bool active;
    }
    
    struct ModelVersion {
        bytes32 modelId;
        bytes32[] previousVersions;
        uint256 latestVersionNumber;
    }
    
    uint256 public constant USD_DECIMALS = 6;
    uint256 public constant TOKENS_PER_MILLION = 1_000_000;
    uint256 public constant MAX_STALE_PRICE = 1 hours;
    string public constant VERSION = "3.1.0";
    
    IERC20 public immutable aicoin;
    address public immutable companyRegistry;
    IAICOracle public aicOracle;
    address public paymentRouter;
    address public verifier;
    
    mapping(bytes32 => ModelInfo) public models;
    mapping(address => bytes32[]) public companyModels;
    mapping(address => mapping(string => ModelVersion)) public modelVersions;
    mapping(address => uint256) public companyNonce;
    mapping(bytes32 => bool) public modelIdExists;
    mapping(ModelCategory => CategoryPriceRange) public categoryPriceRanges;
    bytes32[] public allModelIds;
    bool public autoPricingPaused;
    uint256 public lastKnownGoodPrice;
    
    event ModelRegistered(bytes32 indexed modelId, string name, string version, ModelCategory indexed category, address indexed company, uint256 inputPricePer1M, uint256 outputPricePer1M);
    event ModelStatusUpdated(bytes32 indexed modelId, ModelStatus oldStatus, ModelStatus newStatus);
    event ModelDeactivated(bytes32 indexed modelId);
    event ModelDeprecated(bytes32 indexed modelId, bytes32 indexed newModelId);
    event ModelBanned(bytes32 indexed modelId, string reason);
    event ModelRequestServed(bytes32 indexed modelId, address indexed company, uint256 inputTokens, uint256 outputTokens, uint256 totalAicCharged);
    event ModelUptimeUpdated(bytes32 indexed modelId, uint256 uptimePercent);
    event CategoryPriceRangeUpdated(ModelCategory indexed category, uint256 minInput, uint256 maxInput, uint256 minOutput, uint256 maxOutput);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event PaymentRouterUpdated(address indexed oldRouter, address indexed newRouter);
    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event AutoPricingPaused();
    event AutoPricingUnpaused();
    event VersionDeployed(string version, uint256 timestamp);
    
    error MR__NotRegisteredCompany();
    error MR__NotPaymentRouter();
    error MR__NotVerifier();
    error MR__ModelIdAlreadyExists();
    error MR__ModelNotFound();
    error MR__NotModelOwner();
    error MR__ModelNotActive();
    error MR__PriceOutOfRange();
    error MR__InvalidCategory();
    error MR__ZeroName();
    error MR__ZeroVersion();
    error MR__ZeroZKKey();
    error MR__InvalidHardwareTier();
    error MR__InvalidMemory();
    
    modifier onlyRegisteredCompany() {
        if (!ICompanyRegistry(companyRegistry).isRegistered(msg.sender)) revert MR__NotRegisteredCompany();
        _;
    }
    
    modifier onlyPaymentRouter() {
        if (msg.sender != paymentRouter) revert MR__NotPaymentRouter();
        _;
    }
    
    modifier onlyVerifier() {
        if (msg.sender != verifier) revert MR__NotVerifier();
        _;
    }
    
    modifier modelExists(bytes32 modelId) {
        if (!modelIdExists[modelId]) revert MR__ModelNotFound();
        _;
    }
    
    modifier onlyModelOwner(bytes32 modelId) {
        if (models[modelId].company != msg.sender) revert MR__NotModelOwner();
        _;
    }
    
    constructor(address _aicoin, address _companyRegistry, address _aicOracle) Ownable(msg.sender) {
        require(_aicoin != address(0), "Zero address: aicoin");
        require(_companyRegistry != address(0), "Zero address: companyRegistry");
        aicoin = IERC20(_aicoin);
        companyRegistry = _companyRegistry;
        aicOracle = IAICOracle(_aicOracle);
        paymentRouter = msg.sender;
        verifier = msg.sender;
        _initializeCategoryPriceRanges();
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    function _initializeCategoryPriceRanges() internal {
        categoryPriceRanges[ModelCategory.TEXT] = CategoryPriceRange(50000, 5000000, 200000, 25000000, true);
        categoryPriceRanges[ModelCategory.CODE] = CategoryPriceRange(100000, 8000000, 500000, 40000000, true);
        categoryPriceRanges[ModelCategory.IMAGE] = CategoryPriceRange(500000, 15000000, 2000000, 60000000, true);
        categoryPriceRanges[ModelCategory.AUDIO] = CategoryPriceRange(100000, 32000000, 400000, 128000000, true);
        categoryPriceRanges[ModelCategory.VIDEO] = CategoryPriceRange(2000000, 40000000, 10000000, 200000000, true);
        categoryPriceRanges[ModelCategory.MULTIMODAL] = CategoryPriceRange(500000, 30000000, 2000000, 150000000, true);
        categoryPriceRanges[ModelCategory.REASONING] = CategoryPriceRange(1000000, 20000000, 5000000, 80000000, true);
        categoryPriceRanges[ModelCategory.AGENTIC] = CategoryPriceRange(2000000, 50000000, 10000000, 200000000, true);
    }
    
    function updateCategoryPriceRange(ModelCategory category, uint256 minInput, uint256 maxInput, uint256 minOutput, uint256 maxOutput) external onlyOwner {
        require(maxInput > minInput && maxOutput > minOutput);
        categoryPriceRanges[category] = CategoryPriceRange(minInput, maxInput, minOutput, maxOutput, true);
        emit CategoryPriceRangeUpdated(category, minInput, maxInput, minOutput, maxOutput);
    }
    
    function setOracle(address _oracle) external onlyOwner {
        address old = address(aicOracle);
        aicOracle = IAICOracle(_oracle);
        emit OracleUpdated(old, _oracle);
    }
    
    function setPaymentRouter(address _pr) external onlyOwner {
        address old = paymentRouter;
        paymentRouter = _pr;
        emit PaymentRouterUpdated(old, _pr);
    }
    
    function setVerifier(address _v) external onlyOwner {
        address old = verifier;
        verifier = _v;
        emit VerifierUpdated(old, _v);
    }
    
    function pauseAutoPricing() external onlyOwner {
        autoPricingPaused = true;
        emit AutoPricingPaused();
    }
    
    function unpauseAutoPricing() external onlyOwner {
        autoPricingPaused = false;
        emit AutoPricingUnpaused();
    }
    
    function banModel(bytes32 modelId, string calldata reason) external onlyOwner modelExists(modelId) {
        ModelStatus old = models[modelId].status;
        models[modelId].status = ModelStatus.BANNED;
        emit ModelStatusUpdated(modelId, old, ModelStatus.BANNED);
        emit ModelBanned(modelId, reason);
    }
    
    function registerModel(
        string calldata name, string calldata version, string calldata ipfsMetadata,
        bytes32 zkVerificationKey, bytes32 zkCircuitHash, ModelCategory category,
        uint256 inputPricePer1MTokens, uint256 outputPricePer1MTokens, bool useAutoPricing,
        HardwareTier minHardwareTier, uint256 minMemoryMB, uint256 maxTokensPerRequest
    ) external onlyRegisteredCompany nonReentrant returns (bytes32) {
        if (bytes(name).length == 0) revert MR__ZeroName();
        if (bytes(version).length == 0) revert MR__ZeroVersion();
        if (zkVerificationKey == bytes32(0)) revert MR__ZeroZKKey();
        if (uint8(minHardwareTier) > uint8(HardwareTier.SUPERCOMPUTER)) revert MR__InvalidHardwareTier();
        if (minMemoryMB == 0) revert MR__InvalidMemory();
        
        CategoryPriceRange storage range = categoryPriceRanges[category];
        if (!range.active) revert MR__InvalidCategory();
        if (inputPricePer1MTokens < range.minInputPricePer1M || inputPricePer1MTokens > range.maxInputPricePer1M) revert MR__PriceOutOfRange();
        if (outputPricePer1MTokens < range.minOutputPricePer1M || outputPricePer1MTokens > range.maxOutputPricePer1M) revert MR__PriceOutOfRange();
        
        uint256 nonce = companyNonce[msg.sender]++;
        bytes32 modelId = keccak256(abi.encodePacked(msg.sender, name, version, uint8(category), nonce));
        if (modelIdExists[modelId]) revert MR__ModelIdAlreadyExists();
        
        models[modelId] = ModelInfo({
            name: name, version: version, ipfsMetadata: ipfsMetadata,
            zkVerificationKey: zkVerificationKey, zkCircuitHash: zkCircuitHash,
            company: msg.sender, category: category,
            pricing: PricingConfig(inputPricePer1MTokens, outputPricePer1MTokens, useAutoPricing),
            minHardwareTier: minHardwareTier, minMemoryMB: minMemoryMB,
            maxTokensPerRequest: maxTokensPerRequest, totalRequestsServed: 0,
            totalInputTokensServed: 0, totalOutputTokensServed: 0,
            registeredAt: block.timestamp, lastServedAt: 0, uptimePercent: 100,
            status: ModelStatus.ACTIVE
        });
        
        modelIdExists[modelId] = true;
        allModelIds.push(modelId);
        companyModels[msg.sender].push(modelId);
        
        ModelVersion storage mv = modelVersions[msg.sender][name];
        if (mv.modelId != bytes32(0)) {
            mv.previousVersions.push(mv.modelId);
            models[mv.modelId].status = ModelStatus.DEPRECATED;
            emit ModelDeprecated(mv.modelId, modelId);
        }
        mv.modelId = modelId;
        mv.latestVersionNumber++;
        
        emit ModelRegistered(modelId, name, version, category, msg.sender, inputPricePer1MTokens, outputPricePer1MTokens);
        return modelId;
    }
    
    function _getSafeOraclePrice() internal view returns (uint256) {
        if (autoPricingPaused || address(aicOracle) == address(0)) return 0;
        try aicOracle.lastUpdateTime() returns (uint256 lastUpdate) {
            if (block.timestamp - lastUpdate > MAX_STALE_PRICE) {
                try aicOracle.getTWAP() returns (uint256 twap) { return twap; } catch { return 0; }
            }
            try aicOracle.getAICUsdPrice() returns (uint256 price) { return price; } catch { return 0; }
        } catch {
            return 0;
        }
    }
    
    function getLivePricePer1MTokens(bytes32 modelId, bool isInput) public view modelExists(modelId) returns (uint256) {
        ModelInfo storage model = models[modelId];
        if (!model.pricing.useAutoPricing) {
            return isInput ? model.pricing.inputPricePer1MTokens : model.pricing.outputPricePer1MTokens;
        }
        uint256 oraclePrice = _getSafeOraclePrice();
        if (oraclePrice == 0) {
            return isInput ? model.pricing.inputPricePer1MTokens : model.pricing.outputPricePer1MTokens;
        }
        uint256 usdPrice = isInput ? model.pricing.inputPricePer1MTokens : model.pricing.outputPricePer1MTokens;
        return (usdPrice * 10**8) / oraclePrice;
    }
    
    function calculateRequestCost(bytes32 modelId, uint256 inputTokens, uint256 outputTokens) external view modelExists(modelId) returns (uint256) {
        uint256 inputPrice = getLivePricePer1MTokens(modelId, true);
        uint256 outputPrice = getLivePricePer1MTokens(modelId, false);
        return ((inputTokens * inputPrice) + (outputTokens * outputPrice)) / TOKENS_PER_MILLION;
    }
    
    function recordRequestServed(bytes32 modelId, uint256 inputTokens, uint256 outputTokens, uint256 aicCharged) external onlyPaymentRouter modelExists(modelId) {
        ModelInfo storage model = models[modelId];
        if (model.status != ModelStatus.ACTIVE && model.status != ModelStatus.DEPRECATED) revert MR__ModelNotActive();
        model.totalRequestsServed++;
        model.totalInputTokensServed += inputTokens;
        model.totalOutputTokensServed += outputTokens;
        model.lastServedAt = block.timestamp;
        emit ModelRequestServed(modelId, model.company, inputTokens, outputTokens, aicCharged);
    }
    
    function updateUptime(bytes32 modelId, uint256 uptimePercent) external onlyVerifier modelExists(modelId) {
        require(uptimePercent <= 100);
        models[modelId].uptimePercent = uptimePercent;
        emit ModelUptimeUpdated(modelId, uptimePercent);
    }
    
    function deactivateModel(bytes32 modelId) external modelExists(modelId) onlyModelOwner(modelId) {
        require(models[modelId].status == ModelStatus.ACTIVE);
        models[modelId].status = ModelStatus.INACTIVE;
        emit ModelDeactivated(modelId);
    }
    
    function reactivateModel(bytes32 modelId) external modelExists(modelId) onlyModelOwner(modelId) {
        require(models[modelId].status == ModelStatus.INACTIVE);
        models[modelId].status = ModelStatus.ACTIVE;
    }
    
    function getModel(bytes32 modelId) external view modelExists(modelId) returns (ModelInfo memory) { return models[modelId]; }
    function getModelsByCompany(address company) external view returns (bytes32[] memory) { return companyModels[company]; }
    function getModelCount() external view returns (uint256) { return allModelIds.length; }
    function getLatestModelVersion(address company, string calldata name) external view returns (bytes32) { return modelVersions[company][name].modelId; }
    
    function getModelVerificationData(bytes32 modelId) external view modelExists(modelId) returns (bytes32 zkKey, bytes32 circuitHash, address company, ModelCategory category, bool active) {
        ModelInfo storage m = models[modelId];
        return (m.zkVerificationKey, m.zkCircuitHash, m.company, m.category, m.status == ModelStatus.ACTIVE || m.status == ModelStatus.DEPRECATED);
    }
    
    function getCategoryPriceRange(ModelCategory category) external view returns (CategoryPriceRange memory) { return categoryPriceRanges[category]; }
}