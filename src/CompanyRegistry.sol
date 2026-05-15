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
    }
    
    mapping(address => Company) public companies;
    address[] public registeredAddresses;
    uint256 public totalRegistered;
    
    event CompanyRegistered(address indexed wallet, string name);
    event CompanyVerified(address indexed wallet);
    event CompanyEarningsUpdated(address indexed wallet, uint256 amount);
    
    function register(string calldata name, bytes32 publicKey) external {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(publicKey != bytes32(0), "Public key cannot be zero");
        require(companies[msg.sender].wallet == address(0), "Already registered");
        
        companies[msg.sender] = Company({
            name: name,
            publicKey: publicKey,
            wallet: msg.sender,
            verified: false,
            registeredAt: block.timestamp,
            totalEarned: 0
        });
        
        registeredAddresses.push(msg.sender);
        totalRegistered++;
        
        emit CompanyRegistered(msg.sender, name);
    }
    
    function verify(address company) external {
        require(company != address(0), "Cannot verify zero address");
        require(companies[company].wallet != address(0), "Not registered");
        require(!companies[company].verified, "Already verified");
        companies[company].verified = true;
        emit CompanyVerified(company);
    }
    
    function addEarnings(address company, uint256 amount) external {
        require(company != address(0), "Company cannot be zero address");
        require(companies[company].wallet != address(0), "Not registered");
        require(amount > 0, "Amount must be positive");
        companies[company].totalEarned += amount;
        emit CompanyEarningsUpdated(company, amount);
    }
    
    function isVerified(address company) external view returns (bool) {
        return companies[company].verified;
    }
    
    function getCompanyCount() external view returns (uint256) {
        return totalRegistered;
    }
}