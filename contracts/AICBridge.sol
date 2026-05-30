// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IOracle {
    function getGasPrice(string calldata chain) external view returns (uint256);
    function getLiquidityRatio(string calldata chain) external view returns (uint256);
}

contract AICBridge is Ownable2Step, ReentrancyGuard {
    
    struct ChainInfo {
        string name;
        uint256 chainId;
        bool active;
        uint256 totalBridged;
        uint256 liquidity;
    }
    
    struct BridgeRequest {
        address user;
        string fromChain;
        string toChain;
        uint256 amount;
        uint256 fee;
        uint256 timestamp;
        bool completed;
    }
    
    IERC20 public immutable aicoin;
    IOracle public oracle;
    
    mapping(string => ChainInfo) public chains;
    mapping(uint256 => BridgeRequest) public requests;
    mapping(address => uint256) public totalBridged;
    
    uint256 public requestCounter;
    uint256 public constant BASE_FEE_BPS = 10;      // 0.10%
    uint256 public constant MAX_FEE_BPS = 100;       // 1.00%
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    string[] public supportedChains;
    
    string public constant VERSION = "1.0.0";
    
    event ChainAdded(string name, uint256 chainId);
    event BridgeRequested(uint256 indexed requestId, address indexed user, string fromChain, string toChain, uint256 amount, uint256 fee);
    event BridgeCompleted(uint256 indexed requestId, address indexed user, uint256 amount);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event VersionDeployed(string version, uint256 timestamp);
    
    error AB__ChainNotSupported();
    error AB__InsufficientLiquidity();
    error AB__TransferFailed();
    error AB__ZeroAmount();
    error AB__SameChain();
    
    constructor(address _aicoin, address _oracle) Ownable(msg.sender) {
        require(_aicoin != address(0), "Zero address");
        aicoin = IERC20(_aicoin);
        oracle = IOracle(_oracle);
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    function setOracle(address _oracle) external onlyOwner {
        emit OracleUpdated(address(oracle), _oracle);
        oracle = IOracle(_oracle);
    }
    
    function addChain(string calldata _name, uint256 _chainId) external onlyOwner {
        require(!chains[_name].active, "Already exists");
        chains[_name] = ChainInfo(_name, _chainId, true, 0, 0);
        supportedChains.push(_name);
        emit ChainAdded(_name, _chainId);
    }
    
    function addLiquidity(string calldata _chain, uint256 _amount) external {
        require(chains[_chain].active, "Chain not supported");
        aicoin.transferFrom(msg.sender, address(this), _amount);
        chains[_chain].liquidity += _amount;
    }
    
    function calculateDynamicFee(string calldata _fromChain, string calldata _toChain, uint256 _amount) public view returns (uint256) {
        uint256 gasPrice = oracle.getGasPrice(_toChain);
        uint256 liquidityRatio = oracle.getLiquidityRatio(_toChain);
        uint256 congestionFee = (BASE_FEE_BPS * gasPrice) / 1e9;
        uint256 liquidityFee = liquidityRatio < 50 ? (BASE_FEE_BPS * 2) : BASE_FEE_BPS;
        uint256 totalFeeBps = congestionFee + liquidityFee;
        if (totalFeeBps > MAX_FEE_BPS) totalFeeBps = MAX_FEE_BPS;
        return (_amount * totalFeeBps) / BPS_DENOMINATOR;
    }
    
    function bridgeTokens(string calldata _fromChain, string calldata _toChain, uint256 _amount) external nonReentrant returns (uint256) {
        if (_amount == 0) revert AB__ZeroAmount();
        if (keccak256(bytes(_fromChain)) == keccak256(bytes(_toChain))) revert AB__SameChain();
        if (!chains[_fromChain].active || !chains[_toChain].active) revert AB__ChainNotSupported();
        
        uint256 fee = calculateDynamicFee(_fromChain, _toChain, _amount);
        uint256 totalRequired = _amount + fee;
        
        bool success = aicoin.transferFrom(msg.sender, address(this), totalRequired);
        if (!success) revert AB__TransferFailed();
        
        requestCounter++;
        requests[requestCounter] = BridgeRequest(msg.sender, _fromChain, _toChain, _amount, fee, block.timestamp, true);
        chains[_fromChain].totalBridged += _amount;
        totalBridged[msg.sender] += _amount;
        
        emit BridgeRequested(requestCounter, msg.sender, _fromChain, _toChain, _amount, fee);
        emit BridgeCompleted(requestCounter, msg.sender, _amount);
        
        return requestCounter;
    }
    
    function getChainInfo(string calldata _chain) external view returns (ChainInfo memory) {
        return chains[_chain];
    }
    
    function getSupportedChains() external view returns (string[] memory) {
        return supportedChains;
    }
    
    function getUserBridgedAmount(address _user) external view returns (uint256) {
        return totalBridged[_user];
    }
}