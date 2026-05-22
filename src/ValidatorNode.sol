// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ValidatorNode {
    struct Validator {
        address validatorAddress;
        uint256 stakedAmount;
        uint256 reputation;
        uint256 totalValidations;
        uint256 totalEarned;
        bool active;
        uint256 registeredAt;
    }
    
    mapping(address => Validator) public validators;
    address[] public validatorList;
    uint256 public constant MIN_STAKE = 1000 * 10**9; // 1000 AIC
    
    event ValidatorRegistered(address indexed validator, uint256 stake);
    event ValidatorDeactivated(address indexed validator);
    event ValidationComplete(address indexed validator, uint256 reward);
    
    function register() external payable {
        require(msg.value >= MIN_STAKE, "Insufficient stake");
        require(!validators[msg.sender].active, "Already registered");
        
        validators[msg.sender] = Validator({
            validatorAddress: msg.sender,
            stakedAmount: msg.value,
            reputation: 0,
            totalValidations: 0,
            totalEarned: 0,
            active: true,
            registeredAt: block.timestamp
        });
        
        validatorList.push(msg.sender);
        emit ValidatorRegistered(msg.sender, msg.value);
    }
    
    function completeValidation(address validator, uint256 reward) external {
        Validator storage v = validators[validator];
        require(v.active, "Not active");
        
        v.totalValidations++;
        v.totalEarned += reward;
        v.reputation += 1;
        
        emit ValidationComplete(validator, reward);
    }
    
    function deactivate() external {
        validators[msg.sender].active = false;
        emit ValidatorDeactivated(msg.sender);
    }
    
    function getValidatorCount() external view returns (uint256) {
        return validatorList.length;
    }
} 