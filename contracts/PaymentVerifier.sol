// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract PaymentVerifier is Ownable2Step {
    
    struct ParsedProof {
        uint256 amount;
        string receiverContact;
        string transactionId;
        uint256 timestamp;
        bool isValid;
    }
    
    mapping(uint256 => ParsedProof) public proofs;
    mapping(string => bool) public usedTransactionIds;
    mapping(string => bool) public supportedPaymentMethods;
    mapping(address => bool) public authorizedParsers;
    
    string public constant VERSION = "1.0.0";
    
    event ProofParsed(uint256 indexed tradeId, uint256 amount, string transactionId);
    event ProofValidated(uint256 indexed tradeId, bool isValid);
    event PaymentMethodAdded(string method);
    event PaymentMethodRemoved(string method);
    event ParserAuthorized(address indexed parser, bool authorized);
    event VersionDeployed(string version, uint256 timestamp);
    
    error PV__InvalidProof();
    error PV__DuplicateTransaction();
    error PV__ExpiredProof();
    error PV__NotAuthorized();
    error PV__UnsupportedMethod();
    
    modifier onlyAuthorized() {
        if (!authorizedParsers[msg.sender]) revert PV__NotAuthorized();
        _;
    }
    
    constructor() Ownable(msg.sender) {
        authorizedParsers[msg.sender] = true;
        _initializePaymentMethods();
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    function _initializePaymentMethods() internal {
        supportedPaymentMethods["MTN_Money"] = true;
        supportedPaymentMethods["Orange_Money"] = true;
        supportedPaymentMethods["UPI"] = true;
        supportedPaymentMethods["Pix"] = true;
        supportedPaymentMethods["MPesa"] = true;
        supportedPaymentMethods["GCash"] = true;
        supportedPaymentMethods["Bank_Transfer"] = true;
    }
    
    function addPaymentMethod(string calldata _method) external onlyOwner {
        supportedPaymentMethods[_method] = true;
        emit PaymentMethodAdded(_method);
    }
    
    function removePaymentMethod(string calldata _method) external onlyOwner {
        supportedPaymentMethods[_method] = false;
        emit PaymentMethodRemoved(_method);
    }
    
    function setAuthorizedParser(address _parser, bool _authorized) external onlyOwner {
        authorizedParsers[_parser] = _authorized;
        emit ParserAuthorized(_parser, _authorized);
    }
    
    function parseAndStoreProof(
        uint256 _tradeId,
        uint256 _amount,
        string calldata _receiverContact,
        string calldata _transactionId,
        uint256 _timestamp
    ) external onlyAuthorized {
        if (usedTransactionIds[_transactionId]) revert PV__DuplicateTransaction();
        if (block.timestamp - _timestamp > 30 minutes) revert PV__ExpiredProof();
        usedTransactionIds[_transactionId] = true;
        proofs[_tradeId] = ParsedProof(_amount, _receiverContact, _transactionId, _timestamp, true);
        emit ProofParsed(_tradeId, _amount, _transactionId);
    }
    
    function validateProof(uint256 _tradeId, string calldata _proofData, string calldata _paymentMethod) external view returns (bool) {
        if (!supportedPaymentMethods[_paymentMethod]) revert PV__UnsupportedMethod();
        ParsedProof storage proof = proofs[_tradeId];
        if (!proof.isValid) revert PV__InvalidProof();
        return true;
    }
}