 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IPaymentVerifier {
    function validateProof(uint256 tradeId, string calldata proofData, string calldata paymentMethod) external returns (bool);
}

contract P2PEscrow is Ownable2Step, ReentrancyGuard {
    
    enum TradeStatus { OPEN, TAKEN, PAID, CONFIRMED, DISPUTED, RELEASED, CANCELLED }
    
    struct Trade {
        address seller;
        address buyer;
        uint256 amount;
        string paymentMethod;
        string sellerContact;
        uint256 createdAt;
        TradeStatus status;
        string proofData;
        uint256 disputeId;
        uint256 stake;
    }
    
    IERC20 public immutable aicoin;
    IPaymentVerifier public paymentVerifier;
    
    mapping(uint256 => Trade) public trades;
    mapping(address => uint256) public reputation;
    mapping(address => uint256) public stakedAmount;
    mapping(address => uint256) public completedTrades;
    mapping(address => uint256) public disputedTrades;
    mapping(address => bool) public validators;
    
    uint256 public tradeCounter;
    uint256 public disputeCounter;
    uint256 public constant STAKE_PERCENT = 5;
    uint256 public constant MIN_STAKE = 10 * 10**9;
    uint256 public constant MAX_STAKE = 100000 * 10**9;
    uint256 public constant DISPUTE_TIMEOUT = 24 hours;
    
    string public constant VERSION = "1.2.0";
    
    event TradeCreated(uint256 indexed tradeId, address indexed seller, uint256 amount, string paymentMethod);
    event TradeTaken(uint256 indexed tradeId, address indexed buyer);
    event PaymentSubmitted(uint256 indexed tradeId, string proofData);
    event TradeConfirmed(uint256 indexed tradeId);
    event DisputeRaised(uint256 indexed tradeId, uint256 disputeId, string reason);
    event DisputeResolved(uint256 indexed tradeId, bool sellerWins, string resolution);
    event TradeReleased(uint256 indexed tradeId, address indexed receiver);
    event TradeCancelled(uint256 indexed tradeId);
    event ReputationUpdated(address indexed trader, uint256 newScore);
    event PaymentVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event ValidatorUpdated(address indexed validator, bool active);
    event VersionDeployed(string version, uint256 timestamp);
    
    error PE__InsufficientStake();
    error PE__InvalidTrade();
    error PE__NotBuyerOrSeller();
    error PE__TradeNotInRequiredState();
    error PE__NotValidator();
    error PE__TransferFailed();
    error PE__ZeroAddress();
    
    modifier onlyValidator() {
        if (!validators[msg.sender]) revert PE__NotValidator();
        _;
    }
    
    constructor(address _aicoin, address _paymentVerifier) Ownable(msg.sender) {
        if (_aicoin == address(0) || _paymentVerifier == address(0)) revert PE__ZeroAddress();
        aicoin = IERC20(_aicoin);
        paymentVerifier = IPaymentVerifier(_paymentVerifier);
        validators[msg.sender] = true;
        tradeCounter = 0;
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    function setPaymentVerifier(address _pv) external onlyOwner {
        emit PaymentVerifierUpdated(address(paymentVerifier), _pv);
        paymentVerifier = IPaymentVerifier(_pv);
    }
    
    function setValidator(address _validator, bool _active) external onlyOwner {
        validators[_validator] = _active;
        emit ValidatorUpdated(_validator, _active);
    }
    
    function calculateStake(uint256 _tradeAmount) public pure returns (uint256) {
        uint256 stake = (_tradeAmount * STAKE_PERCENT) / 100;
        if (stake < MIN_STAKE) return MIN_STAKE;
        if (stake > MAX_STAKE) return MAX_STAKE;
        return stake;
    }
    
    function createTrade(uint256 _amount, string calldata _method, string calldata _contact) external nonReentrant {
        uint256 stake = calculateStake(_amount);
        uint256 totalRequired = _amount + stake;
        bool success = aicoin.transferFrom(msg.sender, address(this), totalRequired);
        if (!success) revert PE__TransferFailed();
        stakedAmount[msg.sender] += stake;
        tradeCounter++;
        trades[tradeCounter] = Trade({
            seller: msg.sender,
            buyer: address(0),
            amount: _amount,
            paymentMethod: _method,
            sellerContact: _contact,
            createdAt: block.timestamp,
            status: TradeStatus.OPEN,
            proofData: "",
            disputeId: 0,
            stake: stake
        });
        emit TradeCreated(tradeCounter, msg.sender, _amount, _method);
    }
    
    function takeTrade(uint256 _tradeId) external {
        Trade storage trade = trades[_tradeId];
        if (trade.status != TradeStatus.OPEN) revert PE__TradeNotInRequiredState();
        if (msg.sender == trade.seller) revert PE__InvalidTrade();
        trade.buyer = msg.sender;
        trade.status = TradeStatus.TAKEN;
        emit TradeTaken(_tradeId, msg.sender);
    }
    
    function submitPaymentProof(uint256 _tradeId, string calldata _proofData) external {
        Trade storage trade = trades[_tradeId];
        if (msg.sender != trade.buyer) revert PE__NotBuyerOrSeller();
        if (trade.status != TradeStatus.TAKEN) revert PE__TradeNotInRequiredState();
        trade.proofData = _proofData;
        trade.status = TradeStatus.PAID;
        emit PaymentSubmitted(_tradeId, _proofData);
    }
    
    function confirmReceipt(uint256 _tradeId) external nonReentrant {
        Trade storage trade = trades[_tradeId];
        if (msg.sender != trade.seller) revert PE__NotBuyerOrSeller();
        if (trade.status != TradeStatus.PAID) revert PE__TradeNotInRequiredState();
        trade.status = TradeStatus.RELEASED;
        bool success = aicoin.transfer(trade.buyer, trade.amount);
        if (!success) revert PE__TransferFailed();
        stakedAmount[trade.seller] -= trade.stake;
        aicoin.transfer(trade.seller, trade.stake);
        completedTrades[trade.seller]++;
        completedTrades[trade.buyer]++;
        reputation[trade.seller]++;
        reputation[trade.buyer]++;
        emit TradeReleased(_tradeId, trade.buyer);
    }
    
    function raiseDispute(uint256 _tradeId, string calldata _reason) external {
        Trade storage trade = trades[_tradeId];
        if (msg.sender != trade.seller && msg.sender != trade.buyer) revert PE__NotBuyerOrSeller();
        if (trade.status != TradeStatus.PAID && trade.status != TradeStatus.TAKEN) revert PE__TradeNotInRequiredState();
        disputeCounter++;
        trade.disputeId = disputeCounter;
        trade.status = TradeStatus.DISPUTED;
        disputedTrades[msg.sender]++;
        emit DisputeRaised(_tradeId, disputeCounter, _reason);
    }
    
    function resolveDispute(uint256 _tradeId, bool _sellerWins, string calldata _resolution) external onlyValidator {
        Trade storage trade = trades[_tradeId];
        if (trade.status != TradeStatus.DISPUTED) revert PE__TradeNotInRequiredState();
        trade.status = TradeStatus.RELEASED;
        if (_sellerWins) {
            aicoin.transfer(trade.seller, trade.amount);
            reputation[trade.seller] += 2;
            reputation[trade.buyer] -= 5;
        } else {
            aicoin.transfer(trade.buyer, trade.amount);
            reputation[trade.buyer] += 2;
            reputation[trade.seller] -= 5;
        }
        stakedAmount[trade.seller] -= trade.stake;
        aicoin.transfer(trade.seller, trade.stake);
        emit DisputeResolved(_tradeId, _sellerWins, _resolution);
    }
    
    function cancelTrade(uint256 _tradeId) external nonReentrant {
        Trade storage trade = trades[_tradeId];
        if (msg.sender != trade.seller) revert PE__NotBuyerOrSeller();
        if (trade.status != TradeStatus.OPEN) revert PE__TradeNotInRequiredState();
        trade.status = TradeStatus.CANCELLED;
        aicoin.transfer(trade.seller, trade.amount + trade.stake);
        stakedAmount[trade.seller] -= trade.stake;
        emit TradeCancelled(_tradeId);
    }
}