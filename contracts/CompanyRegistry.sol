 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title CompanyRegistry — Decentralized AI Company Identity & Trust System
/// @notice Companies stake AIC to register. Trust score builds automatically from activity.
/// @dev No human verification. Pure math. Stake slashed for fraud.
contract CompanyRegistry is Ownable2Step, ReentrancyGuard {
    
    // ============ STRUCTS ============
    
    struct Company {
        string name;
        bytes32 publicKey;
        address wallet;
        address modelRegistryPointer;
        string endpointURI;
        bytes32 jurisdictionHash;
        uint256 supportedTokensPerSecond;
        uint256 stakedAmount;
        uint256 registeredAt;
        uint256 totalEarned;
        uint256 totalRequestsServed;
        uint256 totalDisputes;
        uint256 resolvedDisputes;
        uint256 lastActiveAt;
        uint256 trustScore;
        bool verified;
        bool active;
    }
    
    struct Dispute {
        bytes32 disputeId;
        address complainant;
        bytes32 requestId;
        string evidenceHash;
        uint256 amountInDispute;
        uint256 filedAt;
        bool resolved;
        bool upheld;
    }
    
    // ============ CONSTANTS ============
    
    uint256 public constant MINIMUM_STAKE = 10000 * 10**9;       // 10,000 AIC
    uint256 public constant MAXIMUM_STAKE = 1000000 * 10**9;    // 1,000,000 AIC
    uint256 public constant GRACE_PERIOD = 7 days;
    uint256 public constant VERIFICATION_THRESHOLD = 60;         // Trust score to auto-verify
    uint256 public constant MAX_TRUST_SCORE = 100;
    string public constant VERSION = "2.0.0";
    
    // ============ STATE ============
    
    IERC20 public immutable aicoin;
    address public paymentRouter;
    address public verifier;
    
    mapping(address => Company) public companies;
    mapping(address => bool) public isRegistered;
    mapping(string => bool) public nameExists;
    mapping(bytes32 => bool) public publicKeyExists;
    mapping(address => address) public recoveryAddresses;
    mapping(address => Dispute[]) public companyDisputes;
    mapping(bytes32 => Dispute) public disputes;
    
    address[] public registeredAddresses;
    uint256 public totalRegistered;
    uint256 public totalStaked;
    
    // ============ EVENTS ============
    
    event CompanyRegistered(
        address indexed wallet,
        string name,
        bytes32 publicKey,
        uint256 stakedAmount
    );
    event CompanyDeregistered(address indexed wallet, uint256 returnedStake);
    event CompanyAutoVerified(address indexed wallet, uint256 trustScore);
    event TrustScoreUpdated(address indexed company, uint256 oldScore, uint256 newScore);
    event EarningsAdded(address indexed company, uint256 amount);
    event RecoveryAddressSet(address indexed company, address indexed recovery);
    event StakeIncreased(address indexed company, uint256 amount);
    event StakeWithdrawn(address indexed company, uint256 amount);
    event DisputeFiled(bytes32 indexed disputeId, address indexed company, address complainant);
    event DisputeResolved(bytes32 indexed disputeId, bool upheld);
    event CompanySlashed(address indexed company, uint256 slashAmount, string reason);
    event PaymentRouterUpdated(address indexed oldRouter, address indexed newRouter);
    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event VersionDeployed(string version, uint256 timestamp);
    
    // ============ ERRORS ============
    
    error CR__AlreadyRegistered();
    error CR__NotRegistered();
    error CR__NameTaken();
    error CR__PublicKeyTaken();
    error CR__InsufficientStake();
    error CR__ExceedsMaxStake();
    error CR__ZeroAddress();
    error CR__ZeroName();
    error CR__ZeroPublicKey();
    error CR__NotPaymentRouter();
    error CR__NotVerifier();
    error CR__NotGovernance();
    error CR__CompanyNotActive();
    error CR__DisputeNotFound();
    error CR__AlreadyResolved();
    error CR__TransferFailed();
    
    // ============ MODIFIERS ============
    
    modifier onlyPaymentRouter() {
        if (msg.sender != paymentRouter) revert CR__NotPaymentRouter();
        _;
    }
    
    modifier onlyVerifier() {
        if (msg.sender != verifier) revert CR__NotVerifier();
        _;
    }
    
    modifier onlyRegistered(address company) {
        if (!isRegistered[company]) revert CR__NotRegistered();
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor(address _aicoin) Ownable(msg.sender) {
        require(_aicoin != address(0), "Zero address: aicoin");
        aicoin = IERC20(_aicoin);
        paymentRouter = msg.sender;
        verifier = msg.sender;
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    // ============ GOVERNANCE ============
    
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
    
    // ============ REGISTRATION ============
    
    /// @notice Register an AI company by staking AIC. No human approval needed.
    /// @dev Stake is locked as collateral. Trust score starts at 0 and builds over time.
    function register(
        string calldata name,
        bytes32 publicKey,
        address modelRegistryPointer,
        string calldata endpointURI,
        bytes32 jurisdictionHash,
        uint256 supportedTokensPerSecond,
        uint256 stakeAmount
    ) external nonReentrant returns (bool) {
        if (isRegistered[msg.sender]) revert CR__AlreadyRegistered();
        if (bytes(name).length == 0) revert CR__ZeroName();
        if (publicKey == bytes32(0)) revert CR__ZeroPublicKey();
        if (stakeAmount < MINIMUM_STAKE) revert CR__InsufficientStake();
        if (stakeAmount > MAXIMUM_STAKE) revert CR__ExceedsMaxStake();
        if (nameExists[name]) revert CR__NameTaken();
        if (publicKeyExists[publicKey]) revert CR__PublicKeyTaken();
        
        // Pull AIC stake from company
        bool success = aicoin.transferFrom(msg.sender, address(this), stakeAmount);
        if (!success) revert CR__TransferFailed();
        
        companies[msg.sender] = Company({
            name: name,
            publicKey: publicKey,
            wallet: msg.sender,
            modelRegistryPointer: modelRegistryPointer,
            endpointURI: endpointURI,
            jurisdictionHash: jurisdictionHash,
            supportedTokensPerSecond: supportedTokensPerSecond,
            stakedAmount: stakeAmount,
            registeredAt: block.timestamp,
            totalEarned: 0,
            totalRequestsServed: 0,
            totalDisputes: 0,
            resolvedDisputes: 0,
            lastActiveAt: block.timestamp,
            trustScore: 0,
            verified: false,
            active: true
        });
        
        isRegistered[msg.sender] = true;
        nameExists[name] = true;
        publicKeyExists[publicKey] = true;
        registeredAddresses.push(msg.sender);
        totalRegistered++;
        totalStaked += stakeAmount;
        
        emit CompanyRegistered(msg.sender, name, publicKey, stakeAmount);
        return true;
    }
    
    // ============ DEREGISTRATION ============
    
    function deregister() external onlyRegistered(msg.sender) nonReentrant {
        Company storage company = companies[msg.sender];
        require(company.totalDisputes == company.resolvedDisputes, "Pending disputes");
        
        uint256 returnAmount = company.stakedAmount;
        
        // Clean up
        nameExists[company.name] = false;
        publicKeyExists[company.publicKey] = false;
        isRegistered[msg.sender] = false;
        totalStaked -= company.stakedAmount;
        totalRegistered--;
        
        delete companies[msg.sender];
        
        // Return stake
        bool success = aicoin.transfer(msg.sender, returnAmount);
        if (!success) revert CR__TransferFailed();
        
        emit CompanyDeregistered(msg.sender, returnAmount);
    }
    
    // ============ STAKE MANAGEMENT ============
    
    function increaseStake(uint256 amount) external onlyRegistered(msg.sender) nonReentrant {
        Company storage company = companies[msg.sender];
        if (company.stakedAmount + amount > MAXIMUM_STAKE) revert CR__ExceedsMaxStake();
        
        bool success = aicoin.transferFrom(msg.sender, address(this), amount);
        if (!success) revert CR__TransferFailed();
        
        company.stakedAmount += amount;
        totalStaked += amount;
        
        emit StakeIncreased(msg.sender, amount);
        _recalculateTrustScore(msg.sender);
    }
    
    function withdrawStake(uint256 amount) external onlyRegistered(msg.sender) nonReentrant {
        Company storage company = companies[msg.sender];
        if (company.stakedAmount - amount < MINIMUM_STAKE) revert CR__InsufficientStake();
        
        company.stakedAmount -= amount;
        totalStaked -= amount;
        
        bool success = aicoin.transfer(msg.sender, amount);
        if (!success) revert CR__TransferFailed();
        
        emit StakeWithdrawn(msg.sender, amount);
        _recalculateTrustScore(msg.sender);
    }
    
    // ============ EARNINGS (CALLED BY PAYMENT ROUTER) ============
    
    function addEarnings(address company, uint256 amount) external onlyPaymentRouter onlyRegistered(company) {
        Company storage c = companies[company];
        c.totalEarned += amount;
        c.totalRequestsServed++;
        c.lastActiveAt = block.timestamp;
        
        emit EarningsAdded(company, amount);
        _recalculateTrustScore(company);
    }
    
    // ============ TRUST SCORE (AUTOMATIC) ============
    
    /// @notice Trust score is calculated from: stake weight + activity + time + dispute ratio
    /// @dev Pure math. No human input. Score drives auto-verification.
    function _recalculateTrustScore(address companyAddr) internal {
        Company storage c = companies[companyAddr];
        
        uint256 score = 0;
        
        // 1. Stake weight (0-25 points): higher stake = more trust
        uint256 stakeRatio = (c.stakedAmount * 100) / MAXIMUM_STAKE;
        score += (stakeRatio * 25) / 100;
        
        // 2. Request volume (0-25 points): more requests = more trust
        if (c.totalRequestsServed >= 10000) score += 25;
        else if (c.totalRequestsServed >= 5000) score += 20;
        else if (c.totalRequestsServed >= 1000) score += 15;
        else if (c.totalRequestsServed >= 100) score += 10;
        else if (c.totalRequestsServed >= 10) score += 5;
        
        // 3. Account age (0-20 points): older = more trust
        uint256 daysActive = (block.timestamp - c.registeredAt) / 1 days;
        if (daysActive >= 365) score += 20;
        else if (daysActive >= 180) score += 15;
        else if (daysActive >= 90) score += 10;
        else if (daysActive >= 30) score += 5;
        else if (daysActive >= 7) score += 2;
        
        // 4. Dispute ratio (0-30 points): fewer disputes = more trust
        if (c.totalRequestsServed > 0) {
            uint256 disputeRatio = (c.totalDisputes * 100) / c.totalRequestsServed;
            if (disputeRatio == 0) score += 30;
            else if (disputeRatio <= 1) score += 25;
            else if (disputeRatio <= 3) score += 15;
            else if (disputeRatio <= 5) score += 10;
            else if (disputeRatio <= 10) score += 5;
            // >10% dispute rate = 0 points
        } else {
            score += 15; // No history = neutral
        }
        
        // Cap at 100
        if (score > MAX_TRUST_SCORE) score = MAX_TRUST_SCORE;
        
        uint256 oldScore = c.trustScore;
        c.trustScore = score;
        
        emit TrustScoreUpdated(companyAddr, oldScore, score);
        
        // Auto-verify when threshold reached
        if (!c.verified && score >= VERIFICATION_THRESHOLD) {
            c.verified = true;
            emit CompanyAutoVerified(companyAddr, score);
        }
    }
    
    // ============ SLASHING (CALLED BY VERIFIER) ============
    
    function slash(address company, uint256 amount, string calldata reason) external onlyVerifier onlyRegistered(company) {
        Company storage c = companies[company];
        if (amount > c.stakedAmount) amount = c.stakedAmount;
        
        c.stakedAmount -= amount;
        totalStaked -= amount;
        
        // Burn slashed AIC
        if (amount > 0) {
            bool success = aicoin.transfer(address(0), amount);
            if (!success) revert CR__TransferFailed();
        }
        
        // Reset trust
        c.trustScore = 0;
        c.verified = false;
        
        emit CompanySlashed(company, amount, reason);
        emit TrustScoreUpdated(company, c.trustScore, 0);
    }
    
    // ============ DISPUTES ============
    
    function fileDispute(
        address company,
        bytes32 requestId,
        string calldata evidenceHash,
        uint256 amountInDispute
    ) external onlyRegistered(company) returns (bytes32) {
        Company storage c = companies[company];
        
        bytes32 disputeId = keccak256(abi.encodePacked(
            company, msg.sender, requestId, block.timestamp
        ));
        
        Dispute memory newDispute = Dispute({
            disputeId: disputeId,
            complainant: msg.sender,
            requestId: requestId,
            evidenceHash: evidenceHash,
            amountInDispute: amountInDispute,
            filedAt: block.timestamp,
            resolved: false,
            upheld: false
        });
        
        companyDisputes[company].push(newDispute);
        disputes[disputeId] = newDispute;
        c.totalDisputes++;
        
        emit DisputeFiled(disputeId, company, msg.sender);
        return disputeId;
    }
    
    function resolveDispute(bytes32 disputeId, bool upheld) external onlyVerifier {
        Dispute storage dispute = disputes[disputeId];
        if (dispute.filedAt == 0) revert CR__DisputeNotFound();
        if (dispute.resolved) revert CR__AlreadyResolved();
        
        dispute.resolved = true;
        dispute.upheld = upheld;
        
        Company storage c = companies[dispute.complainant];
        c.resolvedDisputes++;
        
        emit DisputeResolved(disputeId, upheld);
    }
    
    // ============ RECOVERY ============
    
    function setRecoveryAddress(address recovery) external onlyRegistered(msg.sender) {
        if (recovery == address(0)) revert CR__ZeroAddress();
        if (recovery == msg.sender) revert CR__ZeroAddress();
        recoveryAddresses[msg.sender] = recovery;
        emit RecoveryAddressSet(msg.sender, recovery);
    }
    
    // ============ VIEWS ============
    
    function getCompany(address companyAddr) external view onlyRegistered(companyAddr) returns (Company memory) {
        return companies[companyAddr];
    }
    
    function getTrustScore(address companyAddr) external view onlyRegistered(companyAddr) returns (uint256) {
        return companies[companyAddr].trustScore;
    }
    
    function getStakeAmount(address companyAddr) external view onlyRegistered(companyAddr) returns (uint256) {
        return companies[companyAddr].stakedAmount;
    }
    
    function isVerified(address companyAddr) external view returns (bool) {
        return isRegistered[companyAddr] && companies[companyAddr].verified;
    }
    
    function getCompanyCount() external view returns (uint256) {
        return totalRegistered;
    }
    
    function getRegisteredCompanies() external view returns (address[] memory) {
        return registeredAddresses;
    }
    
    function getDisputesByCompany(address company) external view returns (Dispute[] memory) {
        return companyDisputes[company];
    }
    
    function isCompanyActive(address companyAddr) external view returns (bool) {
        return isRegistered[companyAddr] && companies[companyAddr].active;
    }
}