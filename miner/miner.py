import hashlib
import json
import time
import os
import numpy as np
from web3 import Web3

# ============================================
# CONFIGURATION
# ============================================
SEPOLIA_RPC = "https://eth-sepolia.g.alchemy.com/v2/z0OM_42vihFYL5R31VT9m"
VERIFIER_ADDRESS = "0xFd1E3587224200c5c9d30Bb4f4852Ef200aA7240"
PRIVATE_KEY = "0xd633c30688b6c17d932c8e91100393ddd41d49f809b4d2dd5207ef87e03b6e1f"

VERIFIER_ABI = [
    {
        "name": "submitProof",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [{"name": "proofHash", "type": "bytes32"}],
        "outputs": [{"type": "bytes32"}],
    },
    {
        "name": "stakes",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "", "type": "address"}],
        "outputs": [{"type": "uint256"}],
    },
]

class AICoinMiner:
    def __init__(self, wallet_address, private_key):
        self.wallet = wallet_address
        self.private_key = private_key
        self.hash_rate = 0
        self.total_mined = 0
        self.is_mining = False
        self.model = None
        self.model_type = None
        self.nonce = None  # Track nonce locally
        
        # Connect to Sepolia
        self.w3 = Web3(Web3.HTTPProvider(SEPOLIA_RPC))
        if self.w3.is_connected():
            self.nonce = self.w3.eth.get_transaction_count(wallet_address)
            print(f"Connected to Sepolia. Block: {self.w3.eth.block_number}")
            print(f"Starting nonce: {self.nonce}")
        else:
            print("Failed to connect to Sepolia!")
            
        self.verifier = self.w3.eth.contract(address=VERIFIER_ADDRESS, abi=VERIFIER_ABI)
        
    def load_model(self, model_path=None):
        try:
            import torch
            import torchvision.models as models
            from torchvision.models import MobileNet_V3_Small_Weights
            
            # FIX: Use weights parameter instead of pretrained=True
            weights = MobileNet_V3_Small_Weights.IMAGENET1K_V1
            self.model = models.mobilenet_v3_small(weights=weights)
            self.model.eval()
            self.model_type = "pytorch"
            print("PyTorch MobileNetV3 loaded (real AI model)")
            return True
        except ImportError:
            print("PyTorch not available, using CPU-based model")
            self.model = self._create_simple_model()
            self.model_type = "cpu"
            return True
    
    def _create_simple_model(self):
        class SimpleModel:
            def predict(self, input_data):
                weights = np.random.randn(100, 100).astype(np.float32)
                x = np.array(input_data).flatten()[:100]
                if len(x) < 100:
                    x = np.pad(x, (0, 100 - len(x)))
                result = np.dot(x, weights)
                return {
                    "output": result.tobytes().hex()[:64],
                    "confidence": float(np.mean(np.abs(result))),
                    "layers_computed": 5
                }
        return SimpleModel()
    
    def preprocess_input(self):
        if self.model_type == "pytorch":
            import torch
            return torch.randn(1, 3, 224, 224)
        return np.random.rand(1, 3, 224, 224).astype(np.float32)
    
    def run_inference(self):
        start_time = time.time()
        input_data = self.preprocess_input()
        
        if self.model_type == "pytorch":
            import torch
            with torch.no_grad():
                output = self.model(input_data)
                predictions = torch.nn.functional.softmax(output, dim=1)
                top_pred = torch.topk(predictions, 5)
                result = {
                    "top_class": top_pred.indices[0][0].item(),
                    "confidence": top_pred.values[0][0].item(),
                    "output_hash": hashlib.sha256(output.numpy().tobytes()).hexdigest()
                }
        else:
            result = self.model.predict(input_data)
        
        computation_time = time.time() - start_time
        return {
            **result,
            "model_type": self.model_type,
            "computation_time": computation_time,
            "timestamp": time.time()
        }
    
    def generate_proof(self, inference_result):
        proof_data = json.dumps({
            "output_hash": inference_result.get("output_hash", ""),
            "confidence": inference_result.get("confidence", 0),
            "model_type": inference_result["model_type"],
            "computation_time": inference_result["computation_time"],
            "timestamp": inference_result["timestamp"]
        }, sort_keys=True)
        return hashlib.sha256(proof_data.encode()).hexdigest()
    
    def submit_to_blockchain(self, proof_hash):
        """Submit proof to Verifier contract on Sepolia with local nonce management"""
        try:
            proof_bytes32 = "0x" + proof_hash
            
            # Build transaction with local nonce
            tx = self.verifier.functions.submitProof(proof_bytes32).build_transaction({
                'from': self.wallet,
                'nonce': self.nonce,  # Use local nonce
                'gas': 200000,
                'gasPrice': self.w3.eth.gas_price,
                'chainId': 11155111,
            })
            
            # Sign and send
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            
            # Increment local nonce
            self.nonce += 1
            
            print(f"  [OK] Proof submitted to Sepolia!")
            print(f"  TX: {tx_hash.hex()[:32]}...")
            return tx_hash.hex()
            
        except Exception as e:
            # On failure, refresh nonce from network
            error_msg = str(e)
            if "nonce" in error_msg.lower() or "underpriced" in error_msg.lower():
                self.nonce = self.w3.eth.get_transaction_count(self.wallet)
                print(f"  [RETRY] Nonce refreshed to {self.nonce}")
            else:
                print(f"  [FAIL] {error_msg[:80]}")
            return None
    
    def mining_loop(self, iterations=5):
        self.is_mining = True
        print(f"\nMining started on Sepolia Testnet")
        print(f"Wallet: {self.wallet}")
        print(f"Model: {self.model_type}")
        print("-" * 55)
        
        for i in range(iterations):
            if not self.is_mining:
                break
            
            print(f"\n[Block {i+1}/{iterations}]")
            
            result = self.run_inference()
            
            if "top_class" in result:
                print(f"  AI classified: Class #{result['top_class']}")
                print(f"  Confidence: {result['confidence']:.4f}")
            print(f"  Compute time: {result['computation_time']:.4f}s")
            
            proof = self.generate_proof(result)
            print(f"  Proof: {proof[:32]}...")
            
            tx_hash = self.submit_to_blockchain(proof)
            
            if tx_hash:
                self.total_mined += 100 * (10**9)
                print(f"  Mined: 100.0 AIC")
            
            # Wait for transaction to be mined before next submission
            time.sleep(15)  # Increased from 3s to 15s for Sepolia
        
        self.is_mining = False
        print("\n" + "=" * 55)
        print("MINING SESSION COMPLETE")
        print(f"Total mined: {self.total_mined / 10**9:.1f} AIC")
        print("=" * 55)


if __name__ == "__main__":
    import sys
    
    wallet = sys.argv[1] if len(sys.argv) > 1 else "0x7A92Ed305671429597FCe407a010a6868283e577"
    iterations = int(sys.argv[2]) if len(sys.argv) > 2 else 2
    
    print("=" * 55)
    print("  AICOIN MINING CLIENT - SEPOLIA TESTNET")
    print("  Proof of Useful AI Work")
    print("=" * 55)
    
    miner = AICoinMiner(wallet, PRIVATE_KEY)
    miner.load_model()
    miner.mining_loop(iterations=iterations) 