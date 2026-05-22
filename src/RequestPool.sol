 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract RequestPool {
    enum RequestStatus { UNASSIGNED, ASSIGNED, COMPLETED, CANCELLED }
    enum HardwareTier { MOBILE, CONSUMER_GPU, DATA_CENTER }
    enum TaskType { 
        PROOF_VERIFICATION,    // 0 — Verify another miner's proof
        DATA_VALIDATION,       // 1 — Validate user input data
        NETWORK_RELAY,         // 2 — Relay messages
        PREPROCESSING,         // 3 — Resize/clean data
        TOKEN_CALCULATION,     // 4 — Count tokens, calculate cost
        SMALL_MODEL_INFERENCE, // 5 — Run models under 4GB
        LARGE_MODEL_INFERENCE, // 6 — Run models over 4GB
        VIDEO_PROCESSING,      // 7 — Process video files
        AGENT_CONVERSATION     // 8 — Process agent-to-agent calls
    }
    
    struct AIRequest {
        uint256 id;
        address user;
        bytes32 modelId;
        string inputDataHash;
        HardwareTier requiredTier;
        TaskType taskType;
        uint256 paymentAmount;
        address assignedMiner;
        RequestStatus status;
        uint256 createdAt;
        bytes32 resultHash;
    }
    
    uint256 public nextRequestId;
    mapping(uint256 => AIRequest) public requests;
    mapping(HardwareTier => uint256[]) public requestsByTier;
    mapping(address => uint256[]) public minerCompletedRequests;
    mapping(TaskType => bool) public validTaskForTier0;
    mapping(TaskType => bool) public validTaskForTier1;
    mapping(TaskType => bool) public validTaskForTier2;
    
    event RequestSubmitted(uint256 indexed requestId, address indexed user, bytes32 modelId, HardwareTier tier, TaskType taskType);
    event RequestAssigned(uint256 indexed requestId, address indexed miner);
    event RequestCompleted(uint256 indexed requestId, address indexed miner, bytes32 resultHash);
    event NetworkTaskCreated(uint256 indexed requestId, TaskType taskType, HardwareTier tier);
    
    constructor() {
        // Tier 0 (Mobile): Lightweight work only
        validTaskForTier0[TaskType.PROOF_VERIFICATION] = true;
        validTaskForTier0[TaskType.DATA_VALIDATION] = true;
        validTaskForTier0[TaskType.NETWORK_RELAY] = true;
        validTaskForTier0[TaskType.PREPROCESSING] = true;
        validTaskForTier0[TaskType.TOKEN_CALCULATION] = true;
        
        // Tier 1 (Consumer GPU): Medium work + everything Tier 0
        validTaskForTier1[TaskType.PROOF_VERIFICATION] = true;
        validTaskForTier1[TaskType.DATA_VALIDATION] = true;
        validTaskForTier1[TaskType.NETWORK_RELAY] = true;
        validTaskForTier1[TaskType.PREPROCESSING] = true;
        validTaskForTier1[TaskType.TOKEN_CALCULATION] = true;
        validTaskForTier1[TaskType.SMALL_MODEL_INFERENCE] = true;
        
        // Tier 2 (Data Center): Everything
        validTaskForTier2[TaskType.PROOF_VERIFICATION] = true;
        validTaskForTier2[TaskType.DATA_VALIDATION] = true;
        validTaskForTier2[TaskType.NETWORK_RELAY] = true;
        validTaskForTier2[TaskType.PREPROCESSING] = true;
        validTaskForTier2[TaskType.TOKEN_CALCULATION] = true;
        validTaskForTier2[TaskType.SMALL_MODEL_INFERENCE] = true;
        validTaskForTier2[TaskType.LARGE_MODEL_INFERENCE] = true;
        validTaskForTier2[TaskType.VIDEO_PROCESSING] = true;
        validTaskForTier2[TaskType.AGENT_CONVERSATION] = true;
    }
    
    function submitRequest(
        bytes32 modelId,
        string calldata inputDataHash,
        HardwareTier requiredTier,
        TaskType taskType,
        uint256 paymentAmount
    ) external returns (uint256) {
        require(isValidTaskForTier(requiredTier, taskType), "Task not valid for this tier");
        
        uint256 requestId = nextRequestId++;
        
        requests[requestId] = AIRequest({
            id: requestId,
            user: msg.sender,
            modelId: modelId,
            inputDataHash: inputDataHash,
            requiredTier: requiredTier,
            taskType: taskType,
            paymentAmount: paymentAmount,
            assignedMiner: address(0),
            status: RequestStatus.UNASSIGNED,
            createdAt: block.timestamp,
            resultHash: bytes32(0)
        });
        
        requestsByTier[requiredTier].push(requestId);
        
        emit RequestSubmitted(requestId, msg.sender, modelId, requiredTier, taskType);
        return requestId;
    }
    
    function createNetworkTask(TaskType taskType, HardwareTier tier) external returns (uint256) {
        require(isValidTaskForTier(tier, taskType), "Task not valid for this tier");
        
        uint256 requestId = nextRequestId++;
        
        requests[requestId] = AIRequest({
            id: requestId,
            user: address(0),
            modelId: bytes32(0),
            inputDataHash: "",
            requiredTier: tier,
            taskType: taskType,
            paymentAmount: 0,
            assignedMiner: address(0),
            status: RequestStatus.UNASSIGNED,
            createdAt: block.timestamp,
            resultHash: bytes32(0)
        });
        
        requestsByTier[tier].push(requestId);
        
        emit NetworkTaskCreated(requestId, taskType, tier);
        return requestId;
    }
    
    function isValidTaskForTier(HardwareTier tier, TaskType taskType) public view returns (bool) {
        if (tier == HardwareTier.MOBILE) return validTaskForTier0[taskType];
        if (tier == HardwareTier.CONSUMER_GPU) return validTaskForTier1[taskType];
        if (tier == HardwareTier.DATA_CENTER) return validTaskForTier2[taskType];
        return false;
    }
    
    function claimRequest(uint256 requestId) external {
        AIRequest storage req = requests[requestId];
        require(req.status == RequestStatus.UNASSIGNED, "Request not available");
        
        req.status = RequestStatus.ASSIGNED;
        req.assignedMiner = msg.sender;
        
        emit RequestAssigned(requestId, msg.sender);
    }
    
    function completeRequest(uint256 requestId, bytes32 resultHash) external {
        AIRequest storage req = requests[requestId];
        require(req.status == RequestStatus.ASSIGNED, "Request not assigned");
        require(req.assignedMiner == msg.sender, "Not your request");
        
        req.status = RequestStatus.COMPLETED;
        req.resultHash = resultHash;
        minerCompletedRequests[msg.sender].push(requestId);
        
        emit RequestCompleted(requestId, msg.sender, resultHash);
    }
    
    function cancelRequest(uint256 requestId) external {
        AIRequest storage req = requests[requestId];
        require(req.user == msg.sender, "Not your request");
        require(req.status == RequestStatus.UNASSIGNED, "Already assigned");
        
        req.status = RequestStatus.CANCELLED;
    }
    
    function getPendingRequestsByTier(HardwareTier tier) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < requestsByTier[tier].length; i++) {
            if (requests[requestsByTier[tier][i]].status == RequestStatus.UNASSIGNED) {
                count++;
            }
        }
        
        uint256[] memory pending = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < requestsByTier[tier].length; i++) {
            uint256 reqId = requestsByTier[tier][i];
            if (requests[reqId].status == RequestStatus.UNASSIGNED) {
                pending[index] = reqId;
                index++;
            }
        }
        return pending;
    }
    
    function getRequest(uint256 requestId) external view returns (AIRequest memory) {
        return requests[requestId];
    }
    
    function getMinerCompletedCount(address miner) external view returns (uint256) {
        return minerCompletedRequests[miner].length;
    }
}