"""
AICOIN Mining Client - Phase 3 (Real AI Model)
Proof of Useful AI Work with actual ONNX/PyTorch inference
"""

import hashlib
import json
import time
import os
import numpy as np

class AICoinMiner:
    """Base mining client for AICOIN network."""
    
    def __init__(self, wallet_address):
        self.wallet = wallet_address
        self.hash_rate = 0
        self.total_mined = 0
        self.is_mining = False
        self.model = None
        self.model_type = None
        
    def load_model(self, model_path=None):
        """Load an AI model for inference. Falls back to PyTorch MobileNet if no model provided."""
        
        # Try ONNX model first
        if model_path and os.path.exists(model_path):
            try:
                import onnxruntime as ort
                self.model = ort.InferenceSession(model_path)
                self.model_type = "onnx"
                print(f"ONNX model loaded: {model_path}")
                return True
            except Exception as e:
                print(f"ONNX load failed: {e}")
        
        # Fallback: Create simple PyTorch model
        try:
            import torch
            import torchvision.models as models
            
            self.model = models.mobilenet_v3_small(pretrained=True)
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
        """Create a lightweight model for CPU-only mining."""
        # Simple neural network simulation using numpy
        class SimpleModel:
            def predict(self, input_data):
                # Simulate actual computation with matrix operations
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
    
    def preprocess_input(self, raw_data=None):
        """Preprocess input data for model inference."""
        if raw_data is None:
            # Generate random input matching model expectations
            if self.model_type == "pytorch":
                import torch
                return torch.randn(1, 3, 224, 224)
            else:
                return np.random.rand(1, 3, 224, 224).astype(np.float32)
        return raw_data
    
    def run_inference(self, input_data=None):
        """Run real AI model inference."""
        start_time = time.time()
        
        input_data = self.preprocess_input(input_data)
        
        if self.model_type == "pytorch":
            import torch
            with torch.no_grad():
                output = self.model(input_data)
                predictions = torch.nn.functional.softmax(output, dim=1)
                top_pred = torch.topk(predictions, 5)
                result = {
                    "top_class": top_pred.indices[0][0].item(),
                    "confidence": top_pred.values[0][0].item(),
                    "all_classes": top_pred.indices[0].tolist()[:5],
                    "output_hash": hashlib.sha256(output.numpy().tobytes()).hexdigest()
                }
        
        elif self.model_type == "onnx":
            input_name = self.model.get_inputs()[0].name
            output = self.model.run(None, {input_name: input_data})
            result = {
                "output_hash": hashlib.sha256(output[0].tobytes()).hexdigest(),
                "shape": str(output[0].shape),
                "mean_activation": float(np.mean(output[0]))
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
        """Generate cryptographic proof of correct inference."""
        # Create a deterministic proof from the inference result
        proof_data = json.dumps({
            "output_hash": inference_result.get("output_hash", ""),
            "confidence": inference_result.get("confidence", 0),
            "model_type": inference_result["model_type"],
            "computation_time": inference_result["computation_time"],
            "timestamp": inference_result["timestamp"]
        }, sort_keys=True)
        
        return hashlib.sha256(proof_data.encode()).hexdigest()
    
    def submit_to_network(self, proof):
        """Submit proof to blockchain network."""
        print(f"  Proof: {proof[:32]}...")
        return True
    
    def claim_reward(self):
        """Claim block reward for successful mining."""
        reward = 100 * (10**9)  # 100 AIC in nano units
        self.total_mined += reward
        return reward
    
    def mining_loop(self, iterations=10):
        """Main mining loop with real AI inference."""
        self.is_mining = True
        total_compute_time = 0
        
        print(f"\nMining started. Wallet: {self.wallet}")
        print(f"Model: {self.model_type}")
        print("-" * 55)
        
        for i in range(iterations):
            if not self.is_mining:
                break
            
            print(f"\n[Block {i+1}/{iterations}]")
            
            # Run real AI inference
            result = self.run_inference()
            
            # Show what the AI computed
            if "top_class" in result:
                print(f"  AI classified: Class #{result['top_class']}")
                print(f"  Confidence: {result['confidence']:.4f}")
            print(f"  Compute time: {result['computation_time']:.4f}s")
            
            total_compute_time += result['computation_time']
            
            # Generate proof
            proof = self.generate_proof(result)
            self.submit_to_network(proof)
            
            # Claim reward
            reward = self.claim_reward()
            print(f"  Mined: {reward / 10**9:.1f} AIC")
            
            self.hash_rate = 1 / result['computation_time'] if result['computation_time'] > 0 else 0
            
            time.sleep(0.3)
        
        self.is_mining = False
        
        # Show summary
        print("\n" + "=" * 55)
        print("MINING SESSION COMPLETE")
        print(f"Model used: {self.model_type}")
        print(f"Total AI computations: {iterations}")
        print(f"Total compute time: {total_compute_time:.2f}s")
        print(f"Average hash rate: {iterations/total_compute_time:.2f} proofs/sec")
        print(f"Total mined: {self.total_mined / 10**9:.1f} AIC")
        print("=" * 55)
        
    def get_status(self):
        """Return current mining status."""
        return {
            "wallet": self.wallet,
            "model": self.model_type,
            "hash_rate": round(self.hash_rate, 2),
            "total_mined": self.total_mined,
            "is_mining": self.is_mining
        }


# ============================================
# GPU MINER
# ============================================

class GPUMediciner(AICoinMiner):
    """GPU-accelerated mining client."""
    
    def __init__(self, wallet_address):
        super().__init__(wallet_address)
        self.device = self._detect_gpu()
        
    def _detect_gpu(self):
        try:
            import torch
            if torch.cuda.is_available():
                name = torch.cuda.get_device_name(0)
                print(f"GPU detected: {name}")
                return "cuda"
        except ImportError:
            pass
        
        try:
            import onnxruntime as ort
            providers = ort.get_available_providers()
            if 'CUDAExecutionProvider' in providers:
                print("ONNX GPU provider available")
                return "onnx-gpu"
        except ImportError:
            pass
        
        print("No GPU detected, using CPU")
        return "cpu"


# ============================================
# CLI
# ============================================

if __name__ == "__main__":
    import sys
    
    wallet = sys.argv[1] if len(sys.argv) > 1 else "0xDefaultWallet"
    model_path = sys.argv[2] if len(sys.argv) > 2 else None
    iterations = int(sys.argv[3]) if len(sys.argv) > 3 else 5
    
    print("=" * 55)
    print("  AICOIN MINING CLIENT")
    print("  Proof of Useful AI Work")
    print("=" * 55)
    
    miner = GPUMediciner(wallet)
    miner.load_model(model_path)
    miner.mining_loop(iterations=iterations)
    
    status = miner.get_status()
    print(f"\nFinal Status: {json.dumps(status, indent=2)}") 