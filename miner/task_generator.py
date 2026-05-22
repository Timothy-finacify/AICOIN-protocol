"""
AICOIN Network Task Generator
Creates work for idle miners so the network never sleeps.
V1.4.0: Added TOKEN_VERIFICATION task type
"""

from web3 import Web3
import time

# ============================================
# CONFIGURATION
# ============================================
SEPOLIA_RPC = "https://eth-sepolia.g.alchemy.com/v2/z0OM_42vihFYL5R31VT9m"
REQUEST_POOL_ADDRESS = "0x2ed4614fb8ffBA39916891F2C5D2efaA47628661"
PRIVATE_KEY = "0xd633c30688b6c17d932c8e91100393ddd41d49f809b4d2dd5207ef87e03b6e1f"
WALLET_ADDRESS = "0x7A92Ed305671429597FCe407a010a6868283e577"

REQUEST_POOL_ABI = [
    {
        "name": "getPendingRequestsByTier",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "tier", "type": "uint8"}],
        "outputs": [{"type": "uint256[]"}],
    },
    {
        "name": "createNetworkTask",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "taskType", "type": "uint8"},
            {"name": "tier", "type": "uint8"},
        ],
        "outputs": [{"type": "uint256"}],
    },
]

# Task types from RequestPool.sol
TASK_TYPES = {
    "PROOF_VERIFICATION": 0,
    "DATA_VALIDATION": 1,
    "NETWORK_RELAY": 2,
    "PREPROCESSING": 3,
    "TOKEN_CALCULATION": 4,
    "SMALL_MODEL_INFERENCE": 5,
    "LARGE_MODEL_INFERENCE": 6,
    "VIDEO_PROCESSING": 7,
    "AGENT_CONVERSATION": 8,
}

# Hardware tiers
TIER_MOBILE = 0
TIER_CONSUMER_GPU = 1
TIER_DATA_CENTER = 2

CREATE_COUNT = 5

class TaskGenerator:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(SEPOLIA_RPC))
        self.pool = self.w3.eth.contract(address=REQUEST_POOL_ADDRESS, abi=REQUEST_POOL_ABI)
        self.nonce = self.w3.eth.get_transaction_count(WALLET_ADDRESS)
        print(f"Task Generator V1.4.0 started. Nonce: {self.nonce}")
    
    def get_pending_count(self, tier):
        try:
            pending = self.pool.functions.getPendingRequestsByTier(tier).call()
            return len(pending)
        except:
            return 0
    
    def create_tasks(self, task_type, tier, count):
        created = 0
        for _ in range(count):
            try:
                tx = self.pool.functions.createNetworkTask(task_type, tier).build_transaction({
                    'from': WALLET_ADDRESS,
                    'nonce': self.nonce,
                    'gas': 200000,
                    'gasPrice': self.w3.eth.gas_price,
                    'chainId': 11155111,
                })
                signed_tx = self.w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
                tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
                self.nonce += 1
                created += 1
                time.sleep(2)
            except Exception as e:
                print(f"  [FAIL] {e}")
                self.nonce = self.w3.eth.get_transaction_count(WALLET_ADDRESS)
        return created
    
    def check_and_refill(self):
        pending_tier0 = self.get_pending_count(TIER_MOBILE)
        pending_tier1 = self.get_pending_count(TIER_CONSUMER_GPU)
        pending_tier2 = self.get_pending_count(TIER_DATA_CENTER)
        total_pending = pending_tier0 + pending_tier1 + pending_tier2
        
        print(f"\n--- Task Generator: Block {self.w3.eth.block_number} ---")
        print(f"Tier 0 (Mobile): {pending_tier0} | Tier 1 (GPU): {pending_tier1} | Tier 2 (DC): {pending_tier2}")
        print(f"Total pending: {total_pending}")
        
        # If network is quiet, create token calculation tasks
        if total_pending < 10:
            print("Network quiet. Creating token calculation tasks...")
            self.create_tasks(TASK_TYPES["TOKEN_CALCULATION"], TIER_MOBILE, CREATE_COUNT)
        
        # If network is very quiet, create verification tasks
        if total_pending < 5:
            print("Network very quiet. Creating verification + validation tasks...")
            self.create_tasks(TASK_TYPES["PROOF_VERIFICATION"], TIER_MOBILE, CREATE_COUNT)
            self.create_tasks(TASK_TYPES["DATA_VALIDATION"], TIER_MOBILE, 3)
        
        # Always keep Tier 0 busy
        if pending_tier0 < 3:
            print("Tier 0 low. Creating relay + preprocessing tasks...")
            self.create_tasks(TASK_TYPES["NETWORK_RELAY"], TIER_MOBILE, 3)
            self.create_tasks(TASK_TYPES["PREPROCESSING"], TIER_MOBILE, 3)
        
        # Keep Tier 1 busy
        if pending_tier1 < 2:
            print("Tier 1 low. Creating preprocessing + token calculation tasks...")
            self.create_tasks(TASK_TYPES["PREPROCESSING"], TIER_CONSUMER_GPU, 3)
            self.create_tasks(TASK_TYPES["TOKEN_CALCULATION"], TIER_CONSUMER_GPU, 3)
        
        # Keep Tier 2 busy
        if pending_tier2 < 2:
            print("Tier 2 low. Creating relay tasks...")
            self.create_tasks(TASK_TYPES["NETWORK_RELAY"], TIER_DATA_CENTER, 3)
    
    def run(self, interval_seconds=120):
        print("=" * 55)
        print("  AICOIN NETWORK TASK GENERATOR V1.4.0")
        print("  Token verification + smart creation")
        print("=" * 55)
        
        while True:
            try:
                self.check_and_refill()
            except Exception as e:
                print(f"[ERROR] {e}")
                self.nonce = self.w3.eth.get_transaction_count(WALLET_ADDRESS)
            
            print(f"\nNext check in {interval_seconds} seconds...")
            time.sleep(interval_seconds)


if __name__ == "__main__":
    generator = TaskGenerator()
    generator.run(interval_seconds=120) 