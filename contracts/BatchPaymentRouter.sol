// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

interface IPaymentRouter {
    function routePayment(address company, bytes32 modelId, uint256 inputTokens, uint256 outputTokens, address payer) external returns (bool);
}

contract BatchPaymentRouter is Ownable2Step {
    
    struct PaymentRequest {
        address company;
        bytes32 modelId;
        uint256 inputTokens;
        uint256 outputTokens;
    }
    
    IPaymentRouter public immutable paymentRouter;
    
    uint256 public totalBatched;
    uint256 public totalSaved;
    uint256 public constant ESTIMATED_GAS_PER_PAYMENT = 120000;
    uint256 public constant BATCH_GAS_SAVINGS = 80000;
    
    string public constant VERSION = "1.0.0";
    
    event BatchProcessed(address indexed payer, uint256 count, uint256 totalGasSaved);
    event VersionDeployed(string version, uint256 timestamp);
    
    error BPR__EmptyBatch();
    error BPR__BatchTooLarge();
    error BPR__PaymentFailed(uint256 index);
    
    constructor(address _paymentRouter) Ownable(msg.sender) {
        require(_paymentRouter != address(0), "Zero address");
        paymentRouter = IPaymentRouter(_paymentRouter);
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    function processBatch(PaymentRequest[] calldata _payments, address _payer) external returns (bool) {
        uint256 len = _payments.length;
        if (len == 0) revert BPR__EmptyBatch();
        if (len > 50) revert BPR__BatchTooLarge();
        
        uint256 gasSaved = len * BATCH_GAS_SAVINGS;
        
        for (uint256 i = 0; i < len; i++) {
            bool success = paymentRouter.routePayment(
                _payments[i].company,
                _payments[i].modelId,
                _payments[i].inputTokens,
                _payments[i].outputTokens,
                _payer
            );
            if (!success) revert BPR__PaymentFailed(i);
        }
        
        totalBatched += len;
        totalSaved += gasSaved;
        
        emit BatchProcessed(_payer, len, gasSaved);
        return true;
    }
    
    function estimateBatchGasSavings(uint256 _count) external pure returns (uint256) {
        return _count * BATCH_GAS_SAVINGS;
    }
}