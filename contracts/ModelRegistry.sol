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
    function getAICUsdPrice() external view returns (uint256); // 8 decimals
    function getTWAP() external view returns (uint256);        // 1-hour TWAP, 8 decimals
    function lastUpdateTime() external view returns (uint256);
}

/// @title ModelRegistry — Multi-Category AI Model Registry with Auto-Pricing
/// @notice Companies register models by category. Prices set in USD, auto-converted to AIC.
/// @dev System-assigned modelIds encode category. Oracle-based pricing keeps market fair.
contract ModelRegistry is Ownable2Step, ReentrancyGuard {
    
    // ============ ENUMS ============
    
    enum ModelCategory {
        TEXT,           // Chat, translation, summarization
        CODE,           // Code generation, debugging
        IMAGE,          // Image understanding, generation
        AUDIO,          // TTS, STT, voice processing
        VIDEO,          // Video analysis, frame processing
        MULTIMODAL,     // Any combination of modalities
        REASONING,      // Complex reasoning, math, logic
        AGENTIC         // Tool use, function calling, autonomous
    }
    
    enum ModelStatus {
        ACTIVE,
        INACTIVE,
        DEPRECATED,
        BANNED
    }
    
    enum HardwareTier {
        MOBILE,
        CONSUMER_GPU,
        DATA_CENTER,
        SUPERCOMPUTER
    }
    
    // ============ STRUCTS ============
    
    struct PricingConfig {
        uint256 inputPricePer1MTokens;   // USD per 1M input tokens (6 decimals: 1000000 = $1.00)
        uint256 outputPricePer1MTokens;  // USD per 1M output tokens (6 decimals)
        bool useAutoPricing;             // false = fixed AIC price mode (legacy)
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
        uint256 minInputPricePer1M;   // USD per 1M, 6 decimals
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
    
    // ============ CONSTANTS ============
    
    uint256 public constant USD_DECIMALS = 6;       // 1 USD = 1,000,000
    uint256 public constant TOKENS_PER_MILLION = 1_000_000;
    uint256 public constant PRICE_DECIMALS = 18;     // For conversion math
    uint256 public constant MAX_STALE_PRICE = 1 hours;
    string public constant VERSION = "3.0.0";
    
    // ============ STATE ============
    
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
    
    // ============ EVENTS ============
    
    event ModelRegistered(
        bytes32 indexed modelId,
        string name,
        string version,
        ModelCategory indexed category,
        address indexed company,
        uint256 inputPricePer1M,
        uint256 outputPricePer1M
    );
    event ModelStatusUpdated(bytes32 indexed modelId, ModelStatus oldStatus, ModelStatus newStatus);
    event ModelDeactivated(bytes32 indexed modelId);
    event ModelDeprecated(bytes32 indexed modelId, bytes32 indexed newModelId);
    event ModelBanned(bytes32 indexed modelId, string reason);
    event ModelRequestServed(
        bytes32 indexed modelId,
        address indexed company,
        uint256 inputTokens,
        uint256 outputTokens,
        uint256 totalAicCharged
    );
    event ModelUptimeUpdated(bytes32 indexed modelId, uint256 uptimePercent);
    event CategoryPriceRangeUpdated(
        ModelCategory indexed category,
        uint256 minInput, uint256 maxInput,
        uint256 minOutput, uint256 maxOutput
    );
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event PaymentRouterUpdated(address indexed oldRouter, address indexed newRouter);
    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event AutoPricingPaused();
    event AutoPricingUnpaused();
    event VersionDeployed(string version, uint256 timestamp);
    
    // ============ ERRORS ============
    
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
    error MR__AutoPricingPaused();
    error MR__StaleOraclePrice();
    error MR__InvalidHardwareTier();
    error MR__InvalidMemory();
    
    // ============ MODIFIERS ============
    
    modifier onlyRegisteredCompany() {
        if (!ICompanyRegistry(companyRegistry).isRegistered(msg.sender)) {
            revert MR__NotRegisteredCompany();
        }
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
    
    // ============ CONSTRUCTOR ============
    
    constructor(address _aicoin, address _companyRegistry, address _aicOracle) Ownable(msg.sender) {
        require(_aicoin != address(0), "Zero address: aicoin");
        require(_companyRegistry != address(0), "Zero address: companyRegistry");
        require(_aicOracle != address(0), "Zero address: oracle");
        
        aicoin = IERC20(_aicoin);
        companyRegistry = _companyRegistry;
        aicOracle = IAICOracle(_aicOracle);
        paymentRouter = msg.sender;
        verifier = msg.sender;
        
        _initializeCategoryPriceRanges();
        
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    // ============ CATEGORY PRICE RANGES (PROTOCOL-ENFORCED) ============
    
    function _initializeCategoryPriceRanges() internal {
        // TEXT: $0.05-$5.00 input, $0.20-$25.00 output (per 1M tokens)
        categoryPriceRanges[ModelCategory.TEXT] = CategoryPriceRange(50000, 5000000, 200000, 25000000, true);
        
        // CODE: $0.10-$8.00 input, $0.50-$40.00 output
        categoryPriceRanges[ModelCategory.CODE] = CategoryPriceRange(100000, 8000000, 500000, 40000000, true);
        
        // IMAGE: $0.50-$15.00 input, $2.00-$60.00 output
        categoryPriceRanges[ModelCategory.IMAGE] = CategoryPriceRange(500000, 15000000, 2000000, 60000000, true);
        
        // AUDIO: $0.10-$32.00 input, $0.40-$128.00 output
        categoryPriceRanges[ModelCategory.AUDIO] = CategoryPriceRange(100000, 32000000, 400000, 128000000, true);
        
        // VIDEO: $2.00-$40.00 input, $10.00-$200.00 output
        categoryPriceRanges[ModelCategory.VIDEO] = CategoryPriceRange(2000000, 40000000, 10000000, 200000000, true);
        
        // MULTIMODAL: $0.50-$30.00 input, $2.00-$150.00 output
        categoryPriceRanges[ModelCategory.MULTIMODAL] = CategoryPriceRange(500000, 30000000, 2000000, 150000000, true);
        
        // REASONING: $1.00-$20.00 input, $5.00-$80.00 output
        categoryPriceRanges[ModelCategory.REASONING] = CategoryPriceRange(1000000, 20000000, 5000000, 80000000, true);
        
        // AGENTIC: $2.00-$50.00 input, $10.00-$200.00 output
        categoryPriceRanges[ModelCategory.AGENTIC] = CategoryPriceRange(2000000, 50000000, 10000000, 200000000, true);
    }
    
    function updateCategoryPriceRange(
        ModelCategory category,
        uint256 minInputPricePer1M,
        uint256 maxInputPricePer1M,
        uint256 minOutputPricePer1M,
        uint256 maxOutputPricePer1M
    ) external onlyOwner {
        require(maxInputPricePer1M > minInputPricePer1M, "Invalid input range");
        require(maxOutputPricePer1M > minOutputPricePer1M, "Invalid output range");
        
        categoryPriceRanges[category] = CategoryPriceRange(
            minInputPricePer1M, maxInputPricePer1M,
            minOutputPricePer1M, maxOutputPricePer1M,
            true
        );
        
        emit CategoryPriceRangeUpdated(
            category, minInputPricePer1M, maxInputPricePer1M,
            minOutputPricePer1M, maxOutputPricePer1M
        );
    }
    
    // ============ GOVERNANCE ============
    
    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Zero address");
        address oldOracle = address(aicOracle);
        aicOracle = IAICOracle(_oracle);
        emit OracleUpdated(oldOracle, _oracle);
    }
    
    function setPaymentRouter(address _paymentRouter) external onlyOwner {
        require(_paymentRouter != address(0), "Zero address");
        address oldRouter = paymentRouter;
        paymentRouter = _paymentRouter;
        emit PaymentRouterUpdated(oldRouter, _paymentRouter);
    }
    
    function setVerifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "Zero address");
        address oldVerifier = verifier;
        verifier = _verifier;
        emit VerifierUpdated(oldVerifier, _verifier);
    }
    
    function pauseAutoPricing() external onlyOwner {
        autoPricingPaused = true;
        lastKnownGoodPrice = _getSafeOraclePrice();
        emit AutoPricingPaused();
    }
    
    function unpauseAutoPricing() external onlyOwner {
        autoPricingPaused = false;
        emit AutoPricingUnpaused();
    }
    
    function banModel(bytes32 modelId, string calldata reason) external onlyOwner modelExists(modelId) {
        ModelStatus oldStatus = models[modelId].status;
        models[modelId].status = ModelStatus.BANNED;
        emit ModelStatusUpdated(modelId, oldStatus, ModelStatus.BANNED);
        emit ModelBanned(modelId, reason);
    }
    
    // ============ MODEL REGISTRATION ============
    
    function registerModel(
        string calldata name,
        string calldata version,
        string calldata ipfsMetadata,
        bytes32 zkVerificationKey,
        bytes32 zkCircuitHash,
        ModelCategory category,
        uint256 inputPricePer1MTokens,
        uint256 outputPricePer1MTokens,
        bool useAutoPricing,
        HardwareTier minHardwareTier,
        uint256 minMemoryMB,
        uint256 maxTokensPerRequest
    ) external onlyRegisteredCompany nonReentrant returns (bytes32) {
        // Validate
        if (bytes(name).length == 0) revert MR__ZeroName();
        if (bytes(version).length == 0) revert MR__ZeroVersion();
        if (zkVerificationKey == bytes32(0)) revert MR__ZeroZKKey();
        if (uint8(minHardwareTier) > uint8(HardwareTier.SUPERCOMPUTER)) revert MR__InvalidHardwareTier();
        if (minMemoryMB == 0) revert MR__InvalidMemory();
        
        // Validate price within category range
        CategoryPriceRange storage range = categoryPriceRanges[category];
        if (!range.active) revert MR__InvalidCategory();
        
        if (inputPricePer1MTokens < range.minInputPricePer1M || 
            inputPricePer1MTokens > range.maxInputPricePer1M) {
            revert MR__PriceOutOfRange();
        }
        if (outputPricePer1MTokens < range.minOutputPricePer1M || 
            outputPricePer1MTokens > range.maxOutputPricePer1M) {
            revert MR__PriceOutOfRange();
        }
        
        // Generate unique modelId (encodes category)
        uint256 nonce = companyNonce[msg.sender]++;
        bytes32 modelId = keccak256(abi.encodePacked(
            msg.sender, name, version, uint8(category), nonce
        ));
        
        if (modelIdExists[modelId]) revert MR__ModelIdAlreadyExists();
        
        // Store model
        models[modelId] = ModelInfo({
            name: name,
            version: version,
            ipfsMetadata: ipfsMetadata,
            zkVerificationKey: zkVerificationKey,
            zkCircuitHash: zkCircuitHash,
            company: msg.sender,
            category: category,
            pricing: PricingConfig({
                inputPricePer1MTokens: inputPricePer1MTokens,
                outputPricePer1MTokens: outputPricePer1MTokens,
                useAutoPricing: useAutoPricing
            }),
            minHardwareTier: minHardwareTier,
            minMemoryMB: minMemoryMB,
            maxTokensPerRequest: maxTokensPerRequest,
            totalRequestsServed: 0,
            totalInputTokensServed: 0,
            totalOutputTokensServed: 0,
            registeredAt: block.timestamp,
            lastServedAt: 0,
            uptimePercent: 100,
            status: ModelStatus.ACTIVE
        });
        
        modelIdExists[modelId] = true;
        allModelIds.push(modelId);
        companyModels[msg.sender].push(modelId);
        
        // Version tracking
        ModelVersion storage mv = modelVersions[msg.sender][name];
        if (mv.modelId != bytes32(0)) {
            mv.previousVersions.push(mv.modelId);
            models[mv.modelId].status = ModelStatus.DEPRECATED;
            emit ModelDeprecated(mv.modelId, modelId);
        }
        mv.modelId = modelId;
        mv.latestVersionNumber++;
        
        emit ModelRegistered(modelId, name, version, category, msg.sender, 
            inputPricePer1MTokens, outputPricePer1MTokens);
        return modelId;
    }
    
    // ============ LIVE PRICING (AUTO-CONVERSION) ============
    
    function _getSafeOraclePrice() internal view returns (uint256) {
        if (autoPricingPaused) return lastKnownGoodPrice;
        
        uint256 lastUpdate = aicOracle.lastUpdateTime();
        if (block.timestamp - lastUpdate > MAX_STALE_PRICE) {
            // Use TWAP if spot price is stale
            return aicOracle.getTWAP();
        }
        return aicOracle.getAICUsdPrice();
    }
    
    function getLivePricePer1MTokens(bytes32 modelId, bool isInput) public view modelExists(modelId) returns (uint256) {
        ModelInfo storage model = models[modelId];
        
        if (!model.pricing.useAutoPricing) {
            // Fixed AIC mode — return the stored USD price as AIC amount (legacy)
            return isInput ? model.pricing.inputPricePer1MTokens : model.pricing.outputPricePer1MTokens;
        }
        
        // Auto-pricing: convert USD to AIC using oracle
        uint256 aicUsdPrice = _getSafeOraclePrice(); // 8 decimals
        
        uint256 usdPrice = isInput ? model.pricing.inputPricePer1MTokens : model.pricing.outputPricePer1MTokens;
        // usdPrice has 6 decimals, aicUsdPrice has 8 decimals
        // aicAmount = usdPrice * 10^8 / aicUsdPrice
        // Result: amount of AIC (with AIC's 9 decimals) per 1M tokens
        
        return (usdPrice * 10**8) / aicUsdPrice;
    }
    
    function calculateRequestCost(
        bytes32 modelId,
        uint256 inputTokens,
        uint256 outputTokens
    ) external view modelExists(modelId) returns (uint256 totalAicCost) {
        uint256 inputPricePer1M = getLivePricePer1MTokens(modelId, true);
        uint256 outputPricePer1M = getLivePricePer1MTokens(modelId, false);
        
        uint256 inputCost = (inputTokens * inputPricePer1M) / TOKENS_PER_MILLION;
        uint256 outputCost = (outputTokens * outputPricePer1M) / TOKENS_PER_MILLION;
        
        return inputCost + outputCost;
    }
    
    // ============ REQUEST SERVING ============
    
    function recordRequestServed(
        bytes32 modelId,
        uint256 inputTokens,
        uint256 outputTokens,
        uint256 aicCharged
    ) external onlyPaymentRouter modelExists(modelId) {
        ModelInfo storage model = models[modelId];
        if (model.status != ModelStatus.ACTIVE && model.status != ModelStatus.DEPRECATED) {
            revert MR__ModelNotActive();
        }
        
        model.totalRequestsServed++;
        model.totalInputTokensServed += inputTokens;
        model.totalOutputTokensServed += outputTokens;
        model.lastServedAt = block.timestamp;
        
        emit ModelRequestServed(modelId, model.company, inputTokens, outputTokens, aicCharged);
    }
    
    // ============ UPTIME (CALLED BY VERIFIER) ============
    
    function updateUptime(bytes32 modelId, uint256 uptimePercent) external onlyVerifier modelExists(modelId) {
        require(uptimePercent <= 100, "Invalid percentage");
        models[modelId].uptimePercent = uptimePercent;
        emit ModelUptimeUpdated(modelId, uptimePercent);
    }
    
    // ============ MODEL LIFECYCLE ============
    
    function deactivateModel(bytes32 modelId) external modelExists(modelId) onlyModelOwner(modelId) {
        ModelInfo storage model = models[modelId];
        require(model.status == ModelStatus.ACTIVE, "Not active");
        ModelStatus oldStatus = model.status;
        model.status = ModelStatus.INACTIVE;
        emit ModelStatusUpdated(modelId, oldStatus, ModelStatus.INACTIVE);
        emit ModelDeactivated(modelId);
    }
    
    function reactivateModel(bytes32 modelId) external modelExists(modelId) onlyModelOwner(modelId) {
        ModelInfo storage model = models[modelId];
        require(model.status == ModelStatus.INACTIVE, "Not inactive");
        ModelStatus oldStatus = model.status;
        model.status = ModelStatus.ACTIVE;
        emit ModelStatusUpdated(modelId, oldStatus, ModelStatus.ACTIVE);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    function getModel(bytes32 modelId) external view modelExists(modelId) returns (ModelInfo memory) {
        return models[modelId];
    }
    
    function getModelsByCompany(address company) external view returns (bytes32[] memory) {
        return companyModels[company];
    }
    
    function getModelsByCategory(ModelCategory category) external view returns (bytes32[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < allModelIds.length; i++) {
            if (models[allModelIds[i]].category == category) count++;
        }
        
        bytes32[] memory result = new bytes32[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allModelIds.length; i++) {
            if (models[allModelIds[i]].category == category) {
                result[index] = allModelIds[i];
                index++;
            }
        }
        return result;
    }
    
    function getModelCount() external view returns (uint256) {
        return allModelIds.length;
    }
    
    function getLatestModelVersion(address company, string calldata name) external view returns (bytes32) {
        return modelVersions[company][name].modelId;
    }
    
    function getModelVerificationData(bytes32 modelId) external view modelExists(modelId) returns (
        bytes32 zkVerificationKey,
        bytes32 zkCircuitHash,
        address company,
        ModelCategory category,
        bool active
    ) {
        ModelInfo storage model = models[modelId];
        bool isActive = (model.status == ModelStatus.ACTIVE || model.status == ModelStatus.DEPRECATED);
        return (model.zkVerificationKey, model.zkCircuitHash, model.company, model.category, isActive);
    }
    
    function getCategoryPriceRange(ModelCategory category) external view returns (CategoryPriceRange memory) {
        return categoryPriceRanges[category];
    }
}