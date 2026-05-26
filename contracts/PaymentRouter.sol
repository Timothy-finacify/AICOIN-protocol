 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ICompanyRegistry {
    function isRegistered(address company) external view returns (bool);
    function isCompanyActive(address company) external view returns (bool);
    function addEarnings(address company, uint256 amount) external;
}

interface IModelRegistry {
    function calculateRequestCost(bytes32 modelId, uint256 inputTokens, uint256 outputTokens) external view returns (uint256);
    function recordRequestServed(bytes32 modelId, uint256 inputTokens, uint256 outputTokens, uint256 aicCharged) external;
}

contract PaymentRouter is Ownable2Step, ReentrancyGuard {
    
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    address public immutable treasury;
    address public immutable validatorPool;
    address public immutable gasRelayerFund;
    address public immutable companyRegistry;
    address public immutable modelRegistry;
    IERC20 public immutable aicoin;
    
    uint256 public constant BURN_PERCENT = 20;
    uint256 public constant TREASURY_BPS = 110;
    uint256 public constant VALIDATOR_BPS = 40;
    uint256 public constant GAS_FUND_BPS = 800;
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    bool public paused;
    string public constant VERSION = "2.0.0";
    
    event PaymentRouted(
        address indexed payer,
        address indexed company,
        bytes32 indexed modelId,
        uint256 totalAmount,
        uint256 burnAmount,
        uint256 treasuryAmount,
        uint256 validatorAmount,
        uint256 gasFundAmount,
        uint256 companyAmount,
        uint256 inputTokens,
        uint256 outputTokens
    );
    event VersionDeployed(string version, uint256 timestamp);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    
    error PR__Paused();
    error PR__ZeroAddress(string param);
    error PR__NotRegisteredCompany();
    error PR__CompanyNotActive();
    error PR__TransferFailed(string destination);
    
    modifier whenNotPaused() {
        if (paused) revert PR__Paused();
        _;
    }
    
    constructor(
        address _treasury,
        address _validatorPool,
        address _gasRelayerFund,
        address _companyRegistry,
        address _modelRegistry,
        address _aicoinToken
    ) Ownable(msg.sender) {
        if (_treasury == address(0)) revert PR__ZeroAddress("treasury");
        if (_validatorPool == address(0)) revert PR__ZeroAddress("validatorPool");
        if (_gasRelayerFund == address(0)) revert PR__ZeroAddress("gasRelayerFund");
        if (_companyRegistry == address(0)) revert PR__ZeroAddress("companyRegistry");
        if (_modelRegistry == address(0)) revert PR__ZeroAddress("modelRegistry");
        if (_aicoinToken == address(0)) revert PR__ZeroAddress("aicoinToken");
        
        treasury = _treasury;
        validatorPool = _validatorPool;
        gasRelayerFund = _gasRelayerFund;
        companyRegistry = _companyRegistry;
        modelRegistry = _modelRegistry;
        aicoin = IERC20(_aicoinToken);
        
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }
    
    function routePayment(
        address company,
        bytes32 modelId,
        uint256 inputTokens,
        uint256 outputTokens,
        address payer
    ) external whenNotPaused nonReentrant returns (bool) {
        if (company == address(0)) revert PR__ZeroAddress("company");
        if (!ICompanyRegistry(companyRegistry).isRegistered(company)) revert PR__NotRegisteredCompany();
        if (!ICompanyRegistry(companyRegistry).isCompanyActive(company)) revert PR__CompanyNotActive();
        
        uint256 totalAmount = IModelRegistry(modelRegistry).calculateRequestCost(modelId, inputTokens, outputTokens);
        if (totalAmount == 0) revert PR__ZeroAddress("amount");
        
        uint256 burnAmount      = (totalAmount * BURN_PERCENT) / 100;
        uint256 treasuryAmount  = (totalAmount * TREASURY_BPS) / BPS_DENOMINATOR;
        uint256 validatorAmount = (totalAmount * VALIDATOR_BPS) / BPS_DENOMINATOR;
        uint256 gasFundAmount   = (totalAmount * GAS_FUND_BPS) / BPS_DENOMINATOR;
        uint256 companyAmount   = totalAmount - burnAmount - treasuryAmount - validatorAmount - gasFundAmount;
        
        bool success = aicoin.transferFrom(payer, address(this), totalAmount);
        if (!success) revert PR__TransferFailed("pull from payer");
        
        _safeTransfer(BURN_ADDRESS, burnAmount);
        _safeTransfer(treasury, treasuryAmount);
        _safeTransfer(validatorPool, validatorAmount);
        _safeTransfer(gasRelayerFund, gasFundAmount);
        _safeTransfer(company, companyAmount);
        
        ICompanyRegistry(companyRegistry).addEarnings(company, companyAmount);
        IModelRegistry(modelRegistry).recordRequestServed(modelId, inputTokens, outputTokens, totalAmount);
        
        emit PaymentRouted(
            payer, company, modelId, totalAmount,
            burnAmount, treasuryAmount, validatorAmount, gasFundAmount, companyAmount,
            inputTokens, outputTokens
        );
        
        return true;
    }
    
    function _safeTransfer(address to, uint256 amount) internal {
        if (amount == 0) return;
        bool success = aicoin.transfer(to, amount);
        if (!success) revert PR__TransferFailed("distribution");
    }
    
    function previewDistribution(uint256 amount) external pure returns (
        uint256 burnAmount,
        uint256 treasuryAmount,
        uint256 validatorAmount,
        uint256 gasFundAmount,
        uint256 companyAmount
    ) {
        burnAmount      = (amount * BURN_PERCENT) / 100;
        treasuryAmount  = (amount * TREASURY_BPS) / BPS_DENOMINATOR;
        validatorAmount = (amount * VALIDATOR_BPS) / BPS_DENOMINATOR;
        gasFundAmount   = (amount * GAS_FUND_BPS) / BPS_DENOMINATOR;
        companyAmount   = amount - burnAmount - treasuryAmount - validatorAmount - gasFundAmount;
    }
}