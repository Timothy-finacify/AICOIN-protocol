// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

interface IPaymentRouter {
    function routePayment(address company, bytes32 modelId, uint256 inputTokens, uint256 outputTokens, address payer) external returns (bool);
}

interface IDeviceRegistry {
    function isDeviceRecognized(bytes32 deviceId) external view returns (bool);
    function isDeviceBanned(bytes32 deviceId) external view returns (bool);
}

contract Session is EIP712 {
    using ECDSA for bytes32;
    
    struct SessionInfo {
        address dapp;
        uint256 allowance;
        uint256 spent;
        uint256 expiresAt;
        bool active;
    }
    
    struct SpendRequest {
        address user;
        address company;
        bytes32 modelId;
        uint256 inputTokens;
        uint256 outputTokens;
        bytes32 deviceId;
        uint256 nonce;
        uint256 deadline;
    }
    
    IPaymentRouter public immutable paymentRouter;
    IDeviceRegistry public deviceRegistry;
    address public gasRelayer;
    
    mapping(address => mapping(address => SessionInfo)) public sessions; // user => dapp => session
    mapping(address => uint256) public dailySpent;
    mapping(address => uint256) public lastResetDay;
    mapping(address => uint256) public nonces;
    
    uint256 public constant MAX_DAILY = 1000 * 10**9;
    uint256 public constant MAX_SESSION_DURATION = 30 days;
    string public constant VERSION = "2.0.0";
    
    event SessionApproved(address indexed user, address indexed dapp, uint256 allowance, uint256 expiresAt);
    event SessionSpent(address indexed user, address indexed dapp, address indexed company, uint256 amount, bytes32 modelId);
    event SessionRevoked(address indexed user, address indexed dapp);
    event DailyLimitHit(address indexed user, uint256 spent, uint256 limit);
    event DeviceRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);
    event VersionDeployed(string version, uint256 timestamp);
    
    error SS__InsufficientAllowance();
    error SS__DailyLimitExceeded();
    error SS__SessionExpired();
    error SS__SessionNotActive();
    error SS__InvalidSignature();
    error SS__ExpiredDeadline();
    error SS__DeviceNotRecognized();
    error SS__DeviceBanned();
    error SS__PaymentFailed();
    
    modifier onlyGasRelayer() {
        require(msg.sender == gasRelayer, "Not gas relayer");
        _;
    }
    
    constructor(address _paymentRouter) EIP712("AICOIN Session", "2.0.0") {
        require(_paymentRouter != address(0), "Zero address");
        paymentRouter = IPaymentRouter(_paymentRouter);
        gasRelayer = msg.sender;
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    function setDeviceRegistry(address _deviceRegistry) external {
        require(msg.sender == gasRelayer, "Not authorized");
        address oldRegistry = address(deviceRegistry);
        deviceRegistry = IDeviceRegistry(_deviceRegistry);
        emit DeviceRegistryUpdated(oldRegistry, _deviceRegistry);
    }
    
    // ============ SESSION MANAGEMENT ============
    
    function approveSession(address dapp, uint256 allowance, uint256 duration) external {
        if (duration > MAX_SESSION_DURATION) duration = MAX_SESSION_DURATION;
        
        sessions[msg.sender][dapp] = SessionInfo({
            dapp: dapp,
            allowance: allowance,
            spent: 0,
            expiresAt: block.timestamp + duration,
            active: true
        });
        
        emit SessionApproved(msg.sender, dapp, allowance, block.timestamp + duration);
    }
    
    function revokeSession(address dapp) external {
        sessions[msg.sender][dapp].active = false;
        emit SessionRevoked(msg.sender, dapp);
    }
    
    // ============ GAS-FREE SPENDING (META-TRANSACTIONS) ============
    
    function spendFromSession(
        SpendRequest calldata request,
        bytes calldata signature
    ) external returns (bool) {
        // Verify signature
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
            keccak256("SpendRequest(address user,address company,bytes32 modelId,uint256 inputTokens,uint256 outputTokens,bytes32 deviceId,uint256 nonce,uint256 deadline)"),
            request.user,
            request.company,
            request.modelId,
            request.inputTokens,
            request.outputTokens,
            request.deviceId,
            request.nonce,
            request.deadline
        )));
        
        address signer = digest.recover(signature);
        if (signer != request.user) revert SS__InvalidSignature();
        if (block.timestamp > request.deadline) revert SS__ExpiredDeadline();
        if (nonces[request.user] != request.nonce) revert SS__InvalidSignature();
        
        // Check device
        if (address(deviceRegistry) != address(0)) {
            if (!deviceRegistry.isDeviceRecognized(request.deviceId)) revert SS__DeviceNotRecognized();
            if (deviceRegistry.isDeviceBanned(request.deviceId)) revert SS__DeviceBanned();
        }
        
        // Check session
        SessionInfo storage session = sessions[request.user][msg.sender];
        if (!session.active) revert SS__SessionNotActive();
        if (block.timestamp > session.expiresAt) revert SS__SessionExpired();
        
        // Reset daily limit if new day
        uint256 today = block.timestamp / 86400;
        if (lastResetDay[request.user] != today) {
            dailySpent[request.user] = 0;
            lastResetDay[request.user] = today;
        }
        
        // Calculate total cost via PaymentRouter (which calls ModelRegistry)
        // We route the payment directly
        uint256 totalCost = _estimateCost(request.modelId, request.inputTokens, request.outputTokens);
        
        if (session.spent + totalCost > session.allowance) revert SS__InsufficientAllowance();
        if (dailySpent[request.user] + totalCost > MAX_DAILY) {
            emit DailyLimitHit(request.user, dailySpent[request.user], MAX_DAILY);
            revert SS__DailyLimitExceeded();
        }
        
        // Update state
        nonces[request.user]++;
        session.spent += totalCost;
        dailySpent[request.user] += totalCost;
        
        // Route payment
        bool success = paymentRouter.routePayment(
            request.company,
            request.modelId,
            request.inputTokens,
            request.outputTokens,
            request.user
        );
        if (!success) revert SS__PaymentFailed();
        
        emit SessionSpent(request.user, msg.sender, request.company, totalCost, request.modelId);
        return true;
    }
    
    function _estimateCost(bytes32 modelId, uint256 inputTokens, uint256 outputTokens) internal view returns (uint256) {
        // PaymentRouter will calculate exact cost via ModelRegistry
        // This is a placeholder - actual cost is determined during routePayment
        return inputTokens + outputTokens; // Simplified; real cost calculated by ModelRegistry
    }
    
    // ============ VIEWS ============
    
    function getSession(address user, address dapp) external view returns (SessionInfo memory) {
        return sessions[user][dapp];
    }
    
    function getRemainingAllowance(address user, address dapp) external view returns (uint256) {
        SessionInfo storage session = sessions[user][dapp];
        if (!session.active || block.timestamp > session.expiresAt) return 0;
        return session.allowance - session.spent;
    }
    
    function getDailyRemaining(address user) external view returns (uint256) {
        uint256 today = block.timestamp / 86400;
        if (lastResetDay[user] != today) return MAX_DAILY;
        if (dailySpent[user] >= MAX_DAILY) return 0;
        return MAX_DAILY - dailySpent[user];
    }
}