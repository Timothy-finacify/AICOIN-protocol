// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAICToken {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

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
    
    address public aicToken;
    uint256 public constant CORRECTION_THRESHOLD = 5; // 5% tolerance
    
    event TokenCountVerified(
        bytes32 indexed requestId,
        address indexed verifier,
        uint256 browserTokens,
        uint256 verifiedTokens,
        bool corrected,
        int256 adjustment
    );
    
    constructor(address _aicToken) {
        aicToken = _aicToken;
    }
    
    function verifyTokenCount(
        bytes32 requestId,
        address user,
        address company,
        uint256 browserTokens,
        uint256 verifiedTokens,
        uint256 pricePerToken
    ) external returns (bool corrected, int256 adjustment) {
        require(verifications[requestId].timestamp == 0, "Already verified");
        
        // Calculate the difference
        int256 tokenDifference = int256(verifiedTokens) - int256(browserTokens);
        
        // If within 5% threshold, no correction needed
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
        
        // Correction needed
        uint256 adjustmentAmount;
        
        if (tokenDifference > 0) {
            // User underpaid — debit user, credit company
            adjustmentAmount = uint256(tokenDifference) * pricePerToken;
            IAICToken(aicToken).transferFrom(user, company, adjustmentAmount);
        } else {
            // User overpaid — credit user, debit company
            adjustmentAmount = uint256(-tokenDifference) * pricePerToken;
            IAICToken(aicToken).transferFrom(company, user, adjustmentAmount);
        }
        
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