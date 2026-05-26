 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokenVerifier {
    
    struct Verification {
        bytes32 requestId;
        address user;
        address company;
        uint256 browserTokens;
        uint256 verifiedTokens;
        uint256 pricePerToken;
        bool corrected;
        uint256 timestamp;
    }
    
    mapping(bytes32 => Verification) public verifications;
    mapping(address => uint256) public totalVerifications;
    mapping(address => bool) public authorizedVerifiers;
    
    address public immutable aicToken;
    address public governance;
    uint256 public constant CORRECTION_THRESHOLD = 5;
    
    event TokenCountVerified(
        bytes32 indexed requestId,
        address indexed verifier,
        uint256 browserTokens,
        uint256 verifiedTokens,
        bool corrected,
        int256 adjustment
    );
    event VerifierAuthorized(address indexed verifier, bool authorized);
    
    modifier onlyAuthorized() {
        require(authorizedVerifiers[msg.sender], "Not authorized");
        _;
    }
    
    modifier onlyGovernance() {
        require(msg.sender == governance, "Only governance");
        _;
    }
    
    constructor(address _aicToken) {
        require(_aicToken != address(0), "Zero address");
        aicToken = _aicToken;
        governance = msg.sender;
        authorizedVerifiers[msg.sender] = true;
    }
    
    function setAuthorizedVerifier(address verifier, bool authorized) external onlyGovernance {
        authorizedVerifiers[verifier] = authorized;
        emit VerifierAuthorized(verifier, authorized);
    }
    
    function verifyTokenCount(
        bytes32 requestId,
        address user,
        address company,
        uint256 browserTokens,
        uint256 verifiedTokens,
        uint256 pricePerToken
    ) external onlyAuthorized returns (bool corrected, int256 adjustment) {
        require(verifications[requestId].timestamp == 0, "Already verified");
        
        int256 tokenDifference = int256(verifiedTokens) - int256(browserTokens);
        
        if (browserTokens > 0) {
            uint256 percentDiff = (uint256(tokenDifference > 0 ? tokenDifference : -tokenDifference) * 100) / browserTokens;
            if (percentDiff <= CORRECTION_THRESHOLD) {
                verifications[requestId] = Verification({
                    requestId: requestId,
                    user: user,
                    company: company,
                    browserTokens: browserTokens,
                    verifiedTokens: verifiedTokens,
                    pricePerToken: pricePerToken,
                    corrected: false,
                    timestamp: block.timestamp
                });
                totalVerifications[msg.sender]++;
                emit TokenCountVerified(requestId, msg.sender, browserTokens, verifiedTokens, false, 0);
                return (false, 0);
            }
        }
        
        uint256 adjustmentAmount;
        bool success;
        
        if (tokenDifference > 0) {
            adjustmentAmount = uint256(tokenDifference) * pricePerToken;
            success = IERC20(aicToken).transferFrom(user, company, adjustmentAmount);
        } else {
            adjustmentAmount = uint256(-tokenDifference) * pricePerToken;
            success = IERC20(aicToken).transferFrom(company, user, adjustmentAmount);
        }
        require(success, "Transfer failed");
        
        verifications[requestId] = Verification({
            requestId: requestId,
            user: user,
            company: company,
            browserTokens: browserTokens,
            verifiedTokens: verifiedTokens,
            pricePerToken: pricePerToken,
            corrected: true,
            timestamp: block.timestamp
        });
        
        totalVerifications[msg.sender]++;
        emit TokenCountVerified(requestId, msg.sender, browserTokens, verifiedTokens, true, tokenDifference);
        
        return (true, tokenDifference);
    }
    
    function getVerification(bytes32 requestId) external view returns (Verification memory) {
        return verifications[requestId];
    }
} 