#!/usr/bin/env python3
"""
AICOIN MINING CLIENT — V3.1.0 PRODUCTION
Integrated: DeviceRegistry, ValidatorPool, Halving, Verifier, ModelRegistry
"""

import hashlib
import json
import time
import os
import sys
import platform
import uuid
import threading
import queue
import socket
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import IntEnum
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware
from eth_account import Account
from eth_account.signers.local import LocalAccount

class Config:
    RPC_ENDPOINTS: List[str] = [
        "https://eth-sepolia.g.alchemy.com/v2/z0OM_42vihFYL5R31VT9m",
        "https://rpc.sepolia.org",
    ]
    
    DEVICE_REGISTRY: str = "0x89FabD2fb937d5Faf75825Be54A6946d3e23c4f1"
    VALIDATOR_POOL: str = "0x0032e83417F778994ECc850fB1Df3886A96E31c4"
    HALVING_CONTROLLER: str = "0x7FF3fCb1066259446F6497e88E76a1AeF362f7DA"
    VERIFIER: str = "0x212409f7ae62999FA274FdD768E80D980A0376B9"
    MODEL_REGISTRY: str = "0x021aa2761aD177b97e311775d219615F2A4aC3cc"
    PAYMENT_ROUTER: str = "0xa4269ceD2c6AE4DF387086970dba7543e5c7e130"
    AICOIN_TOKEN: str = "0xcb0402629AF93ac8205736c771ACB5e842357f66"
    SESSION: str = "0x9F39df31870aeB3F0eb0a12ebBb940dC34281417"
    MINING_RESERVE: str = "0xFA5f35e7501601E2620cD4CE3358160d15eEB595"
    
    CHAIN_ID: int = 11155111
    BLOCK_TIME: int = 12
    MIN_STAKE_AIC: int = 1000 * 10**9
    DEFAULT_GAS_LIMIT: int = 300000
    RETRY_ATTEMPTS: int = 3
    RETRY_DELAY: float = 5.0
    MESH_PORT: int = 9050
    STATE_FILE: str = "miner_state.json"
    LOG_FILE: str = "miner.log"

class HardwareTier(IntEnum):
    MOBILE = 0
    CONSUMER_GPU = 1
    DATA_CENTER = 2
    SUPERCOMPUTER = 3

class MinerStatus(IntEnum):
    OFFLINE = 0
    REGISTERING = 1
    STAKING = 2
    MINING = 3
    VERIFYING = 4
    RELAYING = 5
    ERROR = 99

@dataclass
class MinerState:
    wallet_address: str = ""
    device_id: str = ""
    hardware_tier: int = HardwareTier.MOBILE
    is_registered: bool = False
    is_staked: bool = False
    staked_amount: int = 0
    total_mined: int = 0
    total_verified: int = 0
    total_relayed: int = 0
    blocks_mined: int = 0
    last_block_mined: int = 0
    start_time: float = 0.0
    session_id: str = ""

@dataclass
class ZKVerificationRequest:
    request_id: bytes
    model_id: bytes
    company: str
    proof_hash: bytes
    input_hash: bytes
    output_hash: bytes
    priority: int = 0

DEVICE_REGISTRY_ABI = [
    {"name": "registerDevice", "type": "function", "stateMutability": "nonpayable", "inputs": [{"name": "deviceId", "type": "bytes32"}], "outputs": []},
    {"name": "isDeviceRecognized", "type": "function", "stateMutability": "view", "inputs": [{"name": "deviceId", "type": "bytes32"}], "outputs": [{"type": "bool"}]},
]

VALIDATOR_POOL_ABI = [
    {"name": "stake", "type": "function", "stateMutability": "nonpayable", "inputs": [{"name": "amount", "type": "uint256"}], "outputs": []},
    {"name": "distributeBlockReward", "type": "function", "stateMutability": "nonpayable", "inputs": [], "outputs": []},
    {"name": "getValidatorCount", "type": "function", "stateMutability": "view", "inputs": [], "outputs": [{"type": "uint256"}]},
    {"name": "getValidatorInfo", "type": "function", "stateMutability": "view", "inputs": [{"name": "validator", "type": "address"}], "outputs": [{"name": "staked", "type": "uint256"}, {"name": "earned", "type": "uint256"}, {"name": "active", "type": "bool"}]},
    {"name": "totalStaked", "type": "function", "stateMutability": "view", "inputs": [], "outputs": [{"type": "uint256"}]},
]

HALVING_CONTROLLER_ABI = [
    {"name": "getCurrentReward", "type": "function", "stateMutability": "view", "inputs": [], "outputs": [{"type": "uint256"}]},
    {"name": "miningActive", "type": "function", "stateMutability": "view", "inputs": [], "outputs": [{"type": "bool"}]},
    {"name": "blocksUntilHalving", "type": "function", "stateMutability": "view", "inputs": [], "outputs": [{"type": "uint256"}]},
    {"name": "currentHalving", "type": "function", "stateMutability": "view", "inputs": [], "outputs": [{"type": "uint256"}]},
    {"name": "totalMined", "type": "function", "stateMutability": "view", "inputs": [], "outputs": [{"type": "uint256"}]},
]

VERIFIER_ABI = [
    {"name": "submitProof", "type": "function", "stateMutability": "nonpayable", "inputs": [{"name": "proofHash", "type": "bytes32"}], "outputs": [{"type": "bytes32"}]},
    {"name": "getMinerStatus", "type": "function", "stateMutability": "view", "inputs": [{"name": "minerAddress", "type": "address"}], "outputs": [{"name": "stakeAmount", "type": "uint256"}, {"name": "reputation", "type": "int256"}, {"name": "isBanned", "type": "bool"}, {"name": "offenseCount", "type": "uint256"}, {"name": "consecutiveHonestDays", "type": "uint256"}]},
]

ERC20_ABI = [
    {"name": "approve", "type": "function", "stateMutability": "nonpayable", "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}], "outputs": [{"type": "bool"}]},
    {"name": "allowance", "type": "function", "stateMutability": "view", "inputs": [{"name": "owner", "type": "address"}, {"name": "spender", "type": "address"}], "outputs": [{"type": "uint256"}]},
]

class AICoinMinerV3:
    def __init__(self, private_key: str, wallet_address: str):
        self.account = Account.from_key(private_key)
        self.wallet_address = self._validate_address(wallet_address)
        self.device_id: Optional[bytes] = None
        self.state = MinerState(wallet_address=self.wallet_address)
        self.status = MinerStatus.OFFLINE
        self.is_running = False
        self.nonce_lock = threading.Lock()
        self.verification_queue = queue.Queue(maxsize=1000)
        self.mining_thread: Optional[threading.Thread] = None
        self.relay_thread: Optional[threading.Thread] = None
        self.verification_thread: Optional[threading.Thread] = None
        self.w3 = self._connect_with_failover()
        self.nonce = self.w3.eth.get_transaction_count(self.wallet_address, 'pending')
        self._init_contracts()
        self._load_state()
        self._log("AICoinMinerV3 initialized")
        self._log(f"Wallet: {self.wallet_address}")
    
    def _validate_address(self, address: str) -> str:
        return Web3.to_checksum_address(address)
    
    def _connect_with_failover(self) -> Web3:
        for rpc_url in Config.RPC_ENDPOINTS:
            try:
                w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={'timeout': 30}))
                w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
                if w3.is_connected():
                    self._log(f"Connected: {rpc_url[:50]}...")
                    return w3
            except Exception as e:
                self._log(f"RPC failed: {e}")
        raise ConnectionError("All RPC endpoints failed")
    
    def _init_contracts(self):
        self.device_registry = self.w3.eth.contract(address=self._validate_address(Config.DEVICE_REGISTRY), abi=DEVICE_REGISTRY_ABI)
        self.validator_pool = self.w3.eth.contract(address=self._validate_address(Config.VALIDATOR_POOL), abi=VALIDATOR_POOL_ABI)
        self.halving_controller = self.w3.eth.contract(address=self._validate_address(Config.HALVING_CONTROLLER), abi=HALVING_CONTROLLER_ABI)
        self.verifier = self.w3.eth.contract(address=self._validate_address(Config.VERIFIER), abi=VERIFIER_ABI)
        self.aicoin = self.w3.eth.contract(address=self._validate_address(Config.AICOIN_TOKEN), abi=ERC20_ABI)
    
    def generate_device_id(self) -> bytes:
        components = [platform.node(), platform.processor(), platform.machine(), str(uuid.getnode()), platform.system()]
        return Web3.keccak(text="|".join(components))
    
    def detect_hardware_tier(self) -> HardwareTier:
        import multiprocessing
        cpu_count = multiprocessing.cpu_count()
        if cpu_count >= 64:
            return HardwareTier.DATA_CENTER
        elif cpu_count >= 8:
            return HardwareTier.CONSUMER_GPU
        return HardwareTier.MOBILE
    
    def is_device_registered(self) -> bool:
        if not self.device_id:
            return False
        try:
            return self.device_registry.functions.isDeviceRecognized(self.device_id).call()
        except:
            return False
    
    def register_device(self) -> bool:
        if not self.device_id:
            self.device_id = self.generate_device_id()
            self.state.device_id = '0x' + self.device_id.hex()
        if self.is_device_registered():
            self.state.is_registered = True
            self._save_state()
            return True
        if self.state.is_registered:
            return True
        try:
            tx = self._build_and_send_tx(self.device_registry.functions.registerDevice(self.device_id))
            receipt = self._wait_for_receipt(tx)
            if receipt and receipt.status == 1:
                self.state.is_registered = True
                self._save_state()
                return True
        except Exception as e:
            self._log(f"Registration error: {str(e)[:80]}")
        return False
    
    def is_validator_staked(self) -> Tuple[bool, int]:
        try:
            staked, earned, active = self.validator_pool.functions.getValidatorInfo(self.wallet_address).call()
            return (active and staked >= Config.MIN_STAKE_AIC), staked
        except:
            return False, 0
    
    def stake_as_validator(self) -> bool:
        is_staked, current_stake = self.is_validator_staked()
        if is_staked:
            self.state.is_staked = True
            self.state.staked_amount = current_stake
            return True
        stake_amount = Config.MIN_STAKE_AIC
        try:
            allowance = self.aicoin.functions.allowance(self.wallet_address, Config.VALIDATOR_POOL).call()
            if allowance < stake_amount:
                approve_tx = self._build_and_send_tx(self.aicoin.functions.approve(Config.VALIDATOR_POOL, stake_amount * 10))
                self._wait_for_receipt(approve_tx)
            stake_tx = self._build_and_send_tx(self.validator_pool.functions.stake(stake_amount))
            receipt = self._wait_for_receipt(stake_tx)
            if receipt and receipt.status == 1:
                self.state.is_staked = True
                self.state.staked_amount = stake_amount
                self._save_state()
                return True
        except Exception as e:
            self._log(f"Staking error: {str(e)[:80]}")
        return False
    
    def get_current_block_reward(self) -> int:
        try:
            return self.halving_controller.functions.getCurrentReward().call()
        except:
            return 0
    
    def is_mining_active(self) -> bool:
        try:
            return self.halving_controller.functions.miningActive().call()
        except:
            return False
    
    def mine_block(self) -> Optional[str]:
        if not self.is_mining_active():
            return None
        try:
            tx = self._build_and_send_tx(self.validator_pool.functions.distributeBlockReward())
            receipt = self._wait_for_receipt(tx)
            if receipt and receipt.status == 1:
                reward = self.get_current_block_reward()
                self.state.total_mined += reward
                self.state.blocks_mined += 1
                self.state.last_block_mined = self.w3.eth.block_number
                self._save_state()
                self._log(f"Block mined! +{reward/10**9:.1f} AIC (Total: {self.state.total_mined/10**9:.1f} AIC)")
                return tx.hex()
        except Exception as e:
            error_msg = str(e)
            if "nonce" in error_msg.lower() or "underpriced" in error_msg.lower():
                self._refresh_nonce()
        return None
    
    def mining_loop(self):
        self._log("Mining started")
        self.status = MinerStatus.MINING
        consecutive_errors = 0
        while self.is_running:
            try:
                if self.get_current_block_reward() > 0:
                    result = self.mine_block()
                    consecutive_errors = 0 if result else consecutive_errors + 1
                if consecutive_errors >= 5:
                    self._refresh_nonce()
                    consecutive_errors = 0
                time.sleep(Config.BLOCK_TIME * 0.8)
            except Exception as e:
                consecutive_errors += 1
                if consecutive_errors >= 3:
                    self._refresh_nonce()
                    consecutive_errors = 0
                time.sleep(Config.BLOCK_TIME * 2)
    
    def _build_and_send_tx(self, contract_function, value: int = 0) -> bytes:
        with self.nonce_lock:
            try:
                current_gas_price = self.w3.eth.gas_price
                gas_price = int(current_gas_price * 1.3)
                try:
                    gas_estimate = contract_function.estimate_gas({'from': self.wallet_address, 'value': value})
                    gas_limit = int(gas_estimate * 1.3)
                except:
                    gas_limit = Config.DEFAULT_GAS_LIMIT
                tx = contract_function.build_transaction({'from': self.wallet_address, 'nonce': self.nonce, 'gas': gas_limit, 'gasPrice': gas_price, 'chainId': Config.CHAIN_ID, 'value': value})
                signed_tx = self.account.sign_transaction(tx)
                tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
                self.nonce += 1
                return tx_hash
            except Exception as e:
                if "nonce" in str(e).lower() or "underpriced" in str(e).lower():
                    self._refresh_nonce()
                raise
    
    def _wait_for_receipt(self, tx_hash: bytes, timeout: int = 180):
        for attempt in range(Config.RETRY_ATTEMPTS):
            try:
                return self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=timeout)
            except:
                if attempt < Config.RETRY_ATTEMPTS - 1:
                    time.sleep(Config.RETRY_DELAY)
        return None
    
    def _refresh_nonce(self):
        with self.nonce_lock:
            self.nonce = self.w3.eth.get_transaction_count(self.wallet_address, 'pending')
            self._log(f"Nonce refreshed: {self.nonce}")
    
    def _save_state(self):
        try:
            state_dict = {'wallet_address': self.state.wallet_address, 'device_id': self.state.device_id, 'hardware_tier': self.state.hardware_tier, 'is_registered': self.state.is_registered, 'is_staked': self.state.is_staked, 'staked_amount': self.state.staked_amount, 'total_mined': self.state.total_mined, 'blocks_mined': self.state.blocks_mined}
            with open(Config.STATE_FILE, 'w') as f:
                json.dump(state_dict, f, indent=2)
        except:
            pass
    
    def _load_state(self):
        try:
            if os.path.exists(Config.STATE_FILE):
                with open(Config.STATE_FILE, 'r') as f:
                    data = json.load(f)
                self.state.total_mined = data.get('total_mined', 0)
                self.state.blocks_mined = data.get('blocks_mined', 0)
                self.state.is_registered = data.get('is_registered', False)
                self.state.is_staked = data.get('is_staked', False)
                self.state.staked_amount = data.get('staked_amount', 0)
                self.state.device_id = data.get('device_id', '')
                self.state.hardware_tier = data.get('hardware_tier', HardwareTier.MOBILE)
                if self.state.device_id:
                    self.device_id = bytes.fromhex(self.state.device_id[2:] if self.state.device_id.startswith('0x') else self.state.device_id)
        except:
            pass
    
    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self.state.start_time = time.time()
        self._log("=" * 55)
        self._log("AICOIN MINER V3.1.0 STARTING")
        self._log("=" * 55)
        self.device_id = self.generate_device_id()
        self.state.device_id = '0x' + self.device_id.hex()
        self.state.hardware_tier = int(self.detect_hardware_tier())
        if not self.register_device():
            self._log("Device already registered, continuing...")
        if not self.stake_as_validator():
            self._log("Already staked, continuing...")
        self.mining_thread = threading.Thread(target=self.mining_loop, daemon=True)
        self.mining_thread.start()
        self._log(f"Mining started. Reward: {self.get_current_block_reward()/10**9:.1f} AIC")
    
    def stop(self):
        self.is_running = False
        self.status = MinerStatus.OFFLINE
        self._save_state()
        self._log("Miner stopped")
    
    def get_status(self) -> dict:
        try:
            reward = self.get_current_block_reward()
            active = self.is_mining_active()
            blocks_until = self.halving_controller.functions.blocksUntilHalving().call()
            halving = self.halving_controller.functions.currentHalving().call()
            total_global = self.halving_controller.functions.totalMined().call()
        except:
            reward, active, blocks_until, halving, total_global = 0, False, 0, 0, 0
        return {"status": self.status.name, "wallet": self.wallet_address, "hardware_tier": HardwareTier(self.state.hardware_tier).name, "total_mined_aic": self.state.total_mined / 10**9, "blocks_mined": self.state.blocks_mined, "current_reward_aic": reward / 10**9, "mining_active": active, "current_halving": halving, "blocks_until_halving": blocks_until, "total_mined_global_aic": total_global / 10**9}
    
    def _log(self, message: str):
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        print(log_entry)
        try:
            with open(Config.LOG_FILE, 'a') as f:
                f.write(log_entry + '\n')
        except:
            pass

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="AICOIN Mining Client V3.1.0")
    parser.add_argument("--private-key", required=True)
    parser.add_argument("--wallet", required=True)
    parser.add_argument("--status", action="store_true")
    args = parser.parse_args()
    print("=" * 55)
    print("  AICOIN MINING CLIENT V3.1.0")
    print("=" * 55)
    miner = AICoinMinerV3(args.private_key, args.wallet)
    if args.status:
        print(json.dumps(miner.get_status(), indent=2))
        sys.exit(0)
    try:
        miner.start()
        while miner.is_running:
            time.sleep(60)
            status = miner.get_status()
            print(f"\n[Mining] Blocks: {status['blocks_mined']} | Mined: {status['total_mined_aic']:.1f} AIC")
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        miner.stop()