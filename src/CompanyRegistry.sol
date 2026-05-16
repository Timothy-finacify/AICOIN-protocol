// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CompanyRegistry {
    struct Company {
        string name;
        bytes32 publicKey;
        address wallet;
        bool verified;
        uint256 registeredAt;
        uint256 totalEarned;
        uint256 gracePeriodEnd;
    }
    
    mapping(address => Company) public companies;
    mapping(address => address) public recoveryAddresses;
    mapping(address => uint256) public companyPrices;
    address[] public registeredAddresses;
    uint256 public totalRegistered;
    uint256 public constant GRACE_PERIOD = 7 days;
    string public constant VERSION = "1.0.0";
    
    event CompanyRegistered(address indexed wallet, string name);
    event CompanyVerified(address indexed wallet);
    event CompanyEarningsUpdated(address indexed wallet, uint256 amount);
    event CompanyDeregistered(address indexed wallet);
    event PriceUpdated(address indexed company, uint256 oldPrice, uint256 newPrice);
    event RecoveryAddressSet(address indexed company, address indexed recovery);
    event VersionDeployed(string version, uint256 timestamp);
    
    constructor() {
        emit VersionDeployed(VERSION, block.timestamp);
    }
    
    function register(string calldata name, bytes32 publicKey) external {
        require(bytes(name).length > 0, "Name empty");
        require(publicKey != bytes32(0), "Key zero");
        require(companies[msg.sender].wallet == address(0), "Already registered");
        
        companies[msg.sender] = Company({
            name: name,
            publicKey: publicKey,
            wallet: msg.sender,
            verified: false,
            registeredAt: block.timestamp,
            totalEarned: 0,
            gracePeriodEnd: block.timestamp + GRACE_PERIOD
        });
        
        registeredAddresses.push(msg.sender);
        totalRegistered++;
        emit CompanyRegistered(msg.sender, name);
    }
    
    function deregister() external {
        require(companies[msg.sender].wallet != address(0), "Not registered");
        delete companies[msg.sender];
        totalRegistered--;
        emit CompanyDeregistered(msg.sender);
    }
    
    function verify(address company) external {
        require(company != address(0), "Zero address");
        require(companies[company].wallet != address(0), "Not registered");
        require(!companies[company].verified, "Already verified");
        companies[company].verified = true;
        emit CompanyVerified(company);
    }
    
    function addEarnings(address company, uint256 amount) external {
        require(company != address(0), "Zero address");
        require(companies[company].wallet != address(0), "Not registered");
        require(amount > 0, "Amount zero");
        companies[company].totalEarned += amount;
        emit CompanyEarningsUpdated(company, amount);
    }
    
    function updatePrice(uint256 newPrice) external {
        require(companies[msg.sender].wallet != address(0), "Not registered");
        require(newPrice >= 0.001 * 10**9, "Price too low");
        require(newPrice <= 100 * 10**9, "Price too high");
        uint256 oldPrice = companyPrices[msg.sender];
        companyPrices[msg.sender] = newPrice;
        emit PriceUpdated(msg.sender, oldPrice, newPrice);
    }
    
    function setRecoveryAddress(address recovery) external {
        require(companies[msg.sender].wallet != address(0), "Not registered");
        require(recovery != msg.sender, "Cannot set self");
        recoveryAddresses[msg.sender] = recovery;
        emit RecoveryAddressSet(msg.sender, recovery);
    }
    
    function isInGracePeriod(address company) external view returns (bool) {
        return block.timestamp < companies[company].gracePeriodEnd;
    }
    
    function isVerified(address company) external view returns (bool) {
        return companies[company].verified;
    }
    
    function getCompanyCount() external view returns (uint256) {
        return totalRegistered;
    }
}