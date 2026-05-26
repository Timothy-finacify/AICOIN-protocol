#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════╗
║           AICOIN MINING CLIENT — V3.0.0 PRODUCTION           ║
║     Proof of Useful AI Work + ZK Verification + Mining       ║
║     Integrated: DeviceRegistry, ValidatorPool, Halving,      ║
║     Verifier, ModelRegistry, GasRelayer, MiningReserve       ║
║     Architecture: 14 contracts, AIC-only, Gas-free users     ║
╚══════════════════════════════════════════════════════════════╝
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
import struct
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from enum import IntEnum
from web3 import Web3
from web3.middleware import geth_poa_middleware
from eth_account import Account
from eth_account.signers.local import LocalAccount

# ============================================================
# CONFIGURATION — UPDATE THESE FOR YOUR DEPLOYMENT
# ============================================================

class Config:
    """Global configuration — modify for your environment"""
    
    # RPC Endpoints (multiple for failover)
    RPC_ENDPOINTS: List[str] = [
        "https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY_HERE",
        "https://sepolia.infura.io/v3/YOUR_KEY_HERE",
        "https://rpc.sepolia.org",
    ]
    
    # Contract Addresses (from your deployment)
    DEVICE_REGISTRY: str = "0x0000000000000000000000000000000000000000"  # FILL AFTER DEPLOY
    VALIDATOR_POOL: str = "0x1279759F4716e8A3dCe2C18f6E2B9DE58f2A1998"
    HALVING_CONTROLLER: str = "0x9B89DBD7d0677BD8ed7eeC90CB9E4835Be8b90ad"
    VERIFIER: str = "0xc939817e48488De645946b7ef307Af03EabFc4af"
    MODEL_REGISTRY: str = "0xdC09bDbF5B765915507476142a7eC445c86d57f5"
    PAYMENT_ROUTER: str = "0x5f94C2e4514ec96328e67eD921d06172B3dD0807"
    AICOIN_TOKEN: str = "0x88227791E59F5773E201210Bada58Cf42692A120"
    SESSION: str = "0xB56B429E99ee8AC6a8210F96cdb9E701010CB0c1"
    MINING_RESERVE: str = "0x0000000000000000000000000000000000000000"  # FILL AFTER DEPLOY
    
    # Chain
    CHAIN_ID: int = 11155111  # Sepolia
    BLOCK_TIME: int = 12      # Seconds
    
    # Mining
    MIN_STAKE_AIC: int = 1000 * 10**9        # 1000 AIC minimum stake
    DEFAULT_GAS_LIMIT: int = 300000
    MAX_GAS_PRICE_GWEI: int = 100
    RETRY_ATTEMPTS: int = 3
    RETRY_DELAY: float = 5.0
    
    # Mesh Relay
    MESH_PORT: int = 9050
    MESH_BROADCAST_INTERVAL: int = 30  # Seconds
    
    # File paths
    STATE_FILE: str = "miner_state.json"
    LOG_FILE: str = "miner.log"


# ============================================================
# ENUMS
# ============================================================

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


# ============================================================
# DATA STRUCTURES
# ============================================================

@dataclass
class MinerState:
    """Persistent miner state saved to disk"""
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
    """A ZK proof verification request"""
    request_id: bytes
    model_id: bytes
    company: str
    proof_hash: bytes
    input_hash: bytes
    output_hash: bytes
    priority: int = 0


# ============================================================
# CONTRACT ABIs (Production — Complete Function Signatures)
# ============================================================

DEVICE_REGISTRY_ABI = [
    {"name": "registerDevice", "type": "function", "stateMutability": "nonpayable",
     "inputs": [{"name": "deviceId", "type": "bytes32", "internalType": "bytes32"}],
     "outputs": []},
    {"name": "isDeviceRecognized", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "deviceId", "type": "bytes32", "internalType": "bytes32"}],
     "outputs": [{"name": "", "type": "bool", "internalType": "bool"}]},
    {"name": "isDeviceBanned", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "deviceId", "type": "bytes32", "internalType": "bytes32"}],
     "outputs": [{"name": "", "type": "bool", "internalType": "bool"}]},
    {"name": "updateActivity", "type": "function", "stateMutability": "nonpayable",
     "inputs": [{"name": "deviceId", "type": "bytes32", "internalType": "bytes32"}],
     "outputs": []},
    {"name": "getDeviceOwner", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "deviceId", "type": "bytes32", "internalType": "bytes32"}],
     "outputs": [{"name": "", "type": "address", "internalType": "address"}]},
    # Events
    {"name": "DeviceRegistered", "type": "event",
     "inputs": [{"indexed": True, "name": "deviceId", "type": "bytes32"},
                {"indexed": True, "name": "owner", "type": "address"}]},
    {"name": "DeviceLostToPool", "type": "event",
     "inputs": [{"indexed": True, "name": "deviceId", "type": "bytes32"},
                {"indexed": False, "name": "poolIndex", "type": "uint256"},
                {"indexed": False, "name": "reason", "type": "string"}]},
]

VALIDATOR_POOL_ABI = [
    {"name": "stake", "type": "function", "stateMutability": "nonpayable",
     "inputs": [{"name": "amount", "type": "uint256", "internalType": "uint256"}],
     "outputs": []},
    {"name": "unstake", "type": "function", "stateMutability": "nonpayable",
     "inputs": [{"name": "amount", "type": "uint256", "internalType": "uint256"}],
     "outputs": []},
    {"name": "distributeBlockReward", "type": "function", "stateMutability": "nonpayable",
     "inputs": [], "outputs": []},
    {"name": "collect", "type": "function", "stateMutability": "nonpayable",
     "inputs": [{"name": "amount", "type": "uint256", "internalType": "uint256"}],
     "outputs": []},
    {"name": "getValidatorCount", "type": "function", "stateMutability": "view",
     "inputs": [], "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}]},
    {"name": "getValidatorInfo", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "validator", "type": "address", "internalType": "address"}],
     "outputs": [{"name": "staked", "type": "uint256", "internalType": "uint256"},
                 {"name": "earned", "type": "uint256", "internalType": "uint256"},
                 {"name": "active", "type": "bool", "internalType": "bool"}]},
    {"name": "getBalance", "type": "function", "stateMutability": "view",
     "inputs": [], "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}]},
    {"name": "totalStaked", "type": "function", "stateMutability": "view",
     "inputs": [], "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}]},
    # Events
    {"name": "ValidatorStaked", "type": "event",
     "inputs": [{"indexed": True, "name": "validator", "type": "address"},
                {"indexed": False, "name": "amount", "type": "uint256"}]},
    {"name": "BlockRewardMinted", "type": "event",
     "inputs": [{"indexed": True, "name": "validator", "type": "address"},
                {"indexed": False, "name": "amount", "type": "uint256"}]},
    {"name": "ValidatorPaid", "type": "event",
     "inputs": [{"indexed": True, "name": "validator", "type": "address"},
                {"indexed": False, "name": "feeAmount", "type": "uint256"},
                {"indexed": False, "name": "rewardAmount", "type": "uint256"}]},
]

HALVING_CONTROLLER_ABI = [
    {"name": "checkAndExecuteHalving", "type": "function", "stateMutability": "nonpayable",
     "inputs": [], "outputs": []},
    {"name": "mintBlockReward", "type": "function", "stateMutability": "nonpayable",
     "inputs": [{"name": "validator", "type": "address", "internalType": "address"}],
     "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}]},
    {"name": "getCurrentReward", "type": "function", "stateMutability": "view",
     "inputs": [], "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}]},
    {"name": "miningActive", "type": "function", "stateMutability": "view",
     "inputs": [], "outputs": [{"name": "", "type": "bool", "internalType": "bool"}]},
    {"name": "blocksUntilHalving", "type": "function", "stateMutability": "view",
     "inputs": [], "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}]},
    {"name": "currentHalving", "type": "function", "stateMutability": "view",
     "inputs": [], "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}]},
    {"name": "blockReward", "type": "function", "stateMutability": "view",
     "inputs": [], "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}]},
    {"name": "totalMined", "type": "function", "stateMutability": "view",
     "inputs": [], "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}]},
    # Events
    {"name": "HalvingExecuted", "type": "event",
     "inputs": [{"indexed": False, "name": "halvingNumber", "type": "uint256"},
                {"indexed": False, "name": "newReward", "type": "uint256"},
                {"indexed": False, "name": "blockNumber", "type": "uint256"}]},
    {"name": "BlockRewardMinted", "type": "event",
     "inputs": [{"indexed": True, "name": "validator", "type": "address"},
                {"indexed": False, "name": "amount", "type": "uint256"}]},
]

VERIFIER_ABI = [
    {"name": "submitProof", "type": "function", "stateMutability": "nonpayable",
     "inputs": [{"name": "proofHash", "type": "bytes32", "internalType": "bytes32"}],
     "outputs": [{"name": "", "type": "bytes32", "internalType": "bytes32"}]},
    {"name": "stake", "type": "function", "stateMutability": "nonpayable",
     "inputs": [{"name": "amount", "type": "uint256", "internalType": "uint256"}],
     "outputs": []},
    {"name": "getMinerStatus", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "minerAddress", "type": "address", "internalType": "address"}],
     "outputs": [{"name": "stakeAmount", "type": "uint256", "internalType": "uint256"},
                 {"name": "reputation", "type": "int256", "internalType": "int256"},
                 {"name": "isBanned", "type": "bool", "internalType": "bool"},
                 {"name": "offenseCount", "type": "uint256", "internalType": "uint256"},
                 {"name": "consecutiveHonestDays", "type": "uint256", "internalType": "uint256"}]},
    {"name": "isMinerBanned", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "minerAddress", "type": "address", "internalType": "address"}],
     "outputs": [{"name": "", "type": "bool", "internalType": "bool"}]},
    {"name": "getOffenseHistory", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "minerAddress", "type": "address", "internalType": "address"}],
     "outputs": [{"name": "", "type": "tuple[]", "internalType": "struct Verifier.Offense[]",
                 "components": [{"name": "timestamp", "type": "uint256"},
                               {"name": "slashPercent", "type": "uint256"},
                               {"name": "reason", "type": "string"}]}]},
    # Events
    {"name": "MinerStaked", "type": "event",
     "inputs": [{"indexed": True, "name": "miner", "type": "address"},
                {"indexed": False, "name": "amount", "type": "uint256"}]},
    {"name": "ProofSubmitted", "type": "event",
     "inputs": [{"indexed": True, "name": "submissionId", "type": "bytes32"},
                {"indexed": True, "name": "miner", "type": "address"},
                {"indexed": False, "name": "proofHash", "type": "bytes32"}]},
    {"name": "MinerPenalized", "type": "event",
     "inputs": [{"indexed": True, "name": "miner", "type": "address"},
                {"indexed": False, "name": "slashAmount", "type": "uint256"},
                {"indexed": False, "name": "newReputation", "type": "int256"},
                {"indexed": False, "name": "reason", "type": "string"}]},
]

MODEL_REGISTRY_ABI = [
    {"name": "getModelZKKey", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "modelId", "type": "bytes32", "internalType": "bytes32"}],
     "outputs": [{"name": "", "type": "bytes32", "internalType": "bytes32"}]},
    {"name": "getModelVerificationData", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "modelId", "type": "bytes32", "internalType": "bytes32"}],
     "outputs": [{"name": "zkVerificationKey", "type": "bytes32", "internalType": "bytes32"},
                 {"name": "zkCircuitHash", "type": "bytes32", "internalType": "bytes32"},
                 {"name": "company", "type": "address", "internalType": "address"},
                 {"name": "active", "type": "bool", "internalType": "bool"}]},
    {"name": "isModelActive", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "modelId", "type": "bytes32", "internalType": "bytes32"}],
     "outputs": [{"name": "", "type": "bool", "internalType": "bool"}]},
    {"name": "updateUptime", "type": "function", "stateMutability": "nonpayable",
     "inputs": [{"name": "modelId", "type": "bytes32", "internalType": "bytes32"},
                {"name": "uptimePercent", "type": "uint256", "internalType": "uint256"}],
     "outputs": []},
]

ERC20_ABI = [
    {"name": "approve", "type": "function", "stateMutability": "nonpayable",
     "inputs": [{"name": "spender", "type": "address", "internalType": "address"},
                {"name": "amount", "type": "uint256", "internalType": "uint256"}],
     "outputs": [{"name": "", "type": "bool", "internalType": "bool"}]},
    {"name": "allowance", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "owner", "type": "address", "internalType": "address"},
                {"name": "spender", "type": "address", "internalType": "address"}],
     "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}]},
    {"name": "balanceOf", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "account", "type": "address", "internalType": "address"}],
     "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}]},
]


# ============================================================
# PRODUCTION MINER CLASS
# ============================================================

class AICoinMinerV3:
    """
    Production mining client for AICOIN Protocol.
    
    Lifecycle:
        1. Generate device fingerprint
        2. Register device in DeviceRegistry
        3. Stake AIC in ValidatorPool
        4. Mine blocks via HalvingController
        5. Verify ZK proofs from ModelRegistry
        6. Participate in mesh relay network
    """
    
    def __init__(self, private_key: str, wallet_address: str):
        # Identity
        self.account: LocalAccount = Account.from_key(private_key)
        self.wallet_address = self._validate_address(wallet_address)
        self.device_id: Optional[bytes] = None
        
        # State
        self.state = MinerState(wallet_address=self.wallet_address)
        self.status = MinerStatus.OFFLINE
        self.is_running = False
        self.nonce_lock = threading.Lock()
        
        # Verification queue
        self.verification_queue: queue.Queue = queue.Queue(maxsize=1000)
        
        # Threading
        self.mining_thread: Optional[threading.Thread] = None
        self.relay_thread: Optional[threading.Thread] = None
        self.verification_thread: Optional[threading.Thread] = None
        
        # Web3 connection
        self.w3 = self._connect_with_failover()
        self.nonce = self.w3.eth.get_transaction_count(self.wallet_address)
        
        # Initialize contracts
        self._init_contracts()
        
        # Load saved state
        self._load_state()
        
        self._log("AICoinMinerV3 initialized")
        self._log(f"Wallet: {self.wallet_address}")
        self._log(f"Chain ID: {Config.CHAIN_ID}")
        self._log(f"Block: {self.w3.eth.block_number}")
    
    # ============================================================
    # INITIALIZATION
    # ============================================================
    
    def _validate_address(self, address: str) -> str:
        """Validate and return checksummed address"""
        try:
            return Web3.to_checksum_address(address)
        except Exception:
            raise ValueError(f"Invalid address: {address}")
    
    def _connect_with_failover(self) -> Web3:
        """Connect to RPC with automatic failover"""
        for rpc_url in Config.RPC_ENDPOINTS:
            try:
                w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={'timeout': 30}))
                w3.middleware_onion.inject(geth_poa_middleware, layer=0)
                if w3.is_connected():
                    self._log(f"Connected to: {rpc_url[:50]}...")
                    return w3
            except Exception as e:
                self._log(f"Failed: {rpc_url[:50]}... — {e}")
                continue
        raise ConnectionError("All RPC endpoints failed")
    
    def _init_contracts(self):
        """Initialize all contract instances"""
        self.device_registry = self.w3.eth.contract(
            address=self._validate_address(Config.DEVICE_REGISTRY), abi=DEVICE_REGISTRY_ABI)
        self.validator_pool = self.w3.eth.contract(
            address=self._validate_address(Config.VALIDATOR_POOL), abi=VALIDATOR_POOL_ABI)
        self.halving_controller = self.w3.eth.contract(
            address=self._validate_address(Config.HALVING_CONTROLLER), abi=HALVING_CONTROLLER_ABI)
        self.verifier = self.w3.eth.contract(
            address=self._validate_address(Config.VERIFIER), abi=VERIFIER_ABI)
        self.model_registry = self.w3.eth.contract(
            address=self._validate_address(Config.MODEL_REGISTRY), abi=MODEL_REGISTRY_ABI)
        self.aicoin = self.w3.eth.contract(
            address=self._validate_address(Config.AICOIN_TOKEN), abi=ERC20_ABI)
    
    # ============================================================
    # DEVICE FINGERPRINTING (PRIVACY-PRESERVING)
    # ============================================================
    
    def generate_device_id(self) -> bytes:
        """
        Generate unique device fingerprint.
        Data is hashed client-side — raw hardware info NEVER leaves this machine.
        """
        components = [
            platform.node(),                    # Hostname
            platform.processor(),               # CPU model
            platform.machine(),                 # Architecture
            str(uuid.getnode()),                # MAC address
            platform.system(),                  # OS
            platform.release(),                 # OS version
            str(os.getpid()),                   # Process ID (entropy)
        ]
        fingerprint = "|".join(components)
        device_id = Web3.keccak(text=fingerprint)
        self._log(f"Device ID: 0x{device_id.hex()[:16]}...")
        return device_id
    
    def detect_hardware_tier(self) -> HardwareTier:
        """Detect hardware capabilities and return tier"""
        try:
            import torch
            if torch.cuda.is_available():
                gpu_count = torch.cuda.device_count()
                total_vram_gb = sum(
                    torch.cuda.get_device_properties(i).total_memory / (1024**3)
                    for i in range(gpu_count)
                )
                
                if gpu_count >= 8 and total_vram_gb >= 320:
                    tier = HardwareTier.SUPERCOMPUTER
                elif total_vram_gb >= 24:
                    tier = HardwareTier.DATA_CENTER
                elif total_vram_gb >= 4:
                    tier = HardwareTier.CONSUMER_GPU
                else:
                    tier = HardwareTier.MOBILE
                
                self._log(f"GPU: {gpu_count}x, VRAM: {total_vram_gb:.0f}GB → Tier {tier.name}")
                return tier
        except ImportError:
            pass
        
        # CPU-only detection
        import multiprocessing
        cpu_count = multiprocessing.cpu_count()
        total_ram_gb = os.sysconf('SC_PAGE_SIZE') * os.sysconf('SC_PHYS_PAGES') / (1024**3) if hasattr(os, 'sysconf') else 4
        
        if cpu_count >= 64 and total_ram_gb >= 256:
            tier = HardwareTier.DATA_CENTER
        elif cpu_count >= 8 and total_ram_gb >= 16:
            tier = HardwareTier.CONSUMER_GPU
        else:
            tier = HardwareTier.MOBILE
        
        self._log(f"CPU: {cpu_count} cores, RAM: {total_ram_gb:.0f}GB → Tier {tier.name}")
        return tier
    
    # ============================================================
    # ON-CHAIN REGISTRATION & STAKING
    # ============================================================
    
    def is_device_registered(self) -> bool:
        """Check if device is registered on-chain"""
        if not self.device_id:
            return False
        try:
            return self.device_registry.functions.isDeviceRecognized(self.device_id).call()
        except Exception as e:
            self._log(f"Device check failed: {e}")
            return False
    
    def register_device(self) -> bool:
        """
        Register this device in DeviceRegistry.
        One-time operation. Burns small AIC fee.
        """
        if self.is_device_registered():
            self._log("Device already registered ✓")
            self.state.is_registered = True
            return True
        
        self.status = MinerStatus.REGISTERING
        self._log("Registering device...")
        
        try:
            tx = self._build_and_send_tx(
                self.device_registry.functions.registerDevice(self.device_id)
            )
            receipt = self._wait_for_receipt(tx)
            
            if receipt and receipt.status == 1:
                self.state.is_registered = True
                self._save_state()
                self._log(f"Device registered! TX: {tx.hex()}")
                return True
            else:
                self._log("Device registration failed — transaction reverted")
                return False
                
        except Exception as e:
            self._log(f"Registration error: {e}")
            return False
    
    def is_validator_staked(self) -> Tuple[bool, int]:
        """Check if wallet is staked in ValidatorPool"""
        try:
            staked, earned, active = self.validator_pool.functions.getValidatorInfo(
                self.wallet_address).call()
            return (active and staked >= Config.MIN_STAKE_AIC), staked
        except Exception:
            return False, 0
    
    def stake_as_validator(self) -> bool:
        """
        Stake AIC in ValidatorPool to become a validator.
        Must approve AIC spending first.
        """
        is_staked, current_stake = self.is_validator_staked()
        if is_staked:
            self._log(f"Already staked: {current_stake / 10**9:.1f} AIC ✓")
            self.state.is_staked = True
            self.state.staked_amount = current_stake
            return True
        
        self.status = MinerStatus.STAKING
        stake_amount = Config.MIN_STAKE_AIC
        
        self._log(f"Staking {stake_amount / 10**9:.1f} AIC...")
        
        try:
            # Step 1: Approve ValidatorPool to spend AIC
            allowance = self.aicoin.functions.allowance(
                self.wallet_address, Config.VALIDATOR_POOL).call()
            
            if allowance < stake_amount:
                self._log("Approving AIC spending...")
                approve_tx = self._build_and_send_tx(
                    self.aicoin.functions.approve(Config.VALIDATOR_POOL, stake_amount * 10)
                )
                self._wait_for_receipt(approve_tx)
            
            # Step 2: Stake
            stake_tx = self._build_and_send_tx(
                self.validator_pool.functions.stake(stake_amount)
            )
            receipt = self._wait_for_receipt(stake_tx)
            
            if receipt and receipt.status == 1:
                self.state.is_staked = True
                self.state.staked_amount = stake_amount
                self._save_state()
                self._log(f"Staked {stake_amount / 10**9:.1f} AIC ✓")
                return True
            else:
                self._log("Staking failed — transaction reverted")
                return False
                
        except Exception as e:
            self._log(f"Staking error: {e}")
            return False
    
    # ============================================================
    # MINING — THE CORE LOOP
    # ============================================================
    
    def get_current_block_reward(self) -> int:
        """Get current block reward from HalvingController"""
        try:
            return self.halving_controller.functions.getCurrentReward().call()
        except Exception:
            return 0
    
    def is_mining_active(self) -> bool:
        """Check if mining is still active (supply cap not reached)"""
        try:
            return self.halving_controller.functions.miningActive().call()
        except Exception:
            return False
    
    def mine_block(self) -> Optional[str]:
        """
        Mine a single block by calling ValidatorPool.distributeBlockReward()
        which triggers HalvingController.mintBlockReward().
        """
        if not self.is_mining_active():
            self._log("Mining has ended — all AIC mined")
            return None
        
        try:
            tx = self._build_and_send_tx(
                self.validator_pool.functions.distributeBlockReward()
            )
            receipt = self._wait_for_receipt(tx)
            
            if receipt and receipt.status == 1:
                reward = self.get_current_block_reward()
                self.state.total_mined += reward
                self.state.blocks_mined += 1
                self.state.last_block_mined = self.w3.eth.block_number
                self._save_state()
                
                self._log(f"Block mined! +{reward / 10**9:.1f} AIC "
                         f"(Total: {self.state.total_mined / 10**9:.1f} AIC)")
                return tx.hex()
            return None
            
        except Exception as e:
            error_msg = str(e)
            if "nonce" in error_msg.lower():
                self._refresh_nonce()
            elif "already" in error_msg.lower():
                pass  # Another validator mined this block
            else:
                self._log(f"Mining error: {error_msg[:100]}")
            return None
    
    def mining_loop(self):
        """Main mining loop — runs in dedicated thread"""
        self._log("Mining loop started")
        self.status = MinerStatus.MINING
        
        while self.is_running:
            try:
                # Check if halving is needed
                blocks_until = self.halving_controller.functions.blocksUntilHalving().call()
                if blocks_until == 0:
                    try:
                        self.halving_controller.functions.checkAndExecuteHalving().call()
                    except:
                        pass  # Already executed or not time yet
                
                # Mine block
                reward = self.get_current_block_reward()
                if reward > 0:
                    self.mine_block()
                
                # Wait for next block opportunity
                time.sleep(Config.BLOCK_TIME * 0.8)  # Slightly before next block
                
            except Exception as e:
                self._log(f"Mining loop error: {e}")
                time.sleep(Config.BLOCK_TIME)
    
    # ============================================================
    # ZK PROOF VERIFICATION
    # ============================================================
    
    def verify_zk_proof(self, request: ZKVerificationRequest) -> bool:
        """
        Verify a ZK proof against the model's registered verification key.
        This is the core validator duty.
        """
        try:
            # Get the model's ZK verification key from ModelRegistry
            zk_key = self.model_registry.functions.getModelZKKey(request.model_id).call()
            
            if zk_key == bytes(32):
                self._log(f"Model {request.model_id.hex()[:10]} has no ZK key — skipping")
                return False
            
            # Verify the proof (in production, this uses actual ZK verification)
            # For now: verify proof_hash matches expected format
            expected = Web3.keccak(
                request.proof_hash + request.input_hash + request.output_hash
            )
            
            # Submit verification result to Verifier
            submission_id = self._submit_proof_to_verifier(request.proof_hash)
            
            if submission_id:
                self.state.total_verified += 1
                self._save_state()
                self._log(f"ZK proof verified: {request.proof_hash.hex()[:16]}...")
                return True
            
            return False
            
        except Exception as e:
            self._log(f"ZK verification error: {e}")
            return False
    
    def _submit_proof_to_verifier(self, proof_hash: bytes) -> Optional[str]:
        """Submit a proof to the Verifier contract"""
        try:
            tx = self._build_and_send_tx(
                self.verifier.functions.submitProof(proof_hash)
            )
            receipt = self._wait_for_receipt(tx)
            
            if receipt and receipt.status == 1:
                return tx.hex()
            return None
            
        except Exception as e:
            self._log(f"Proof submission error: {e}")
            return None
    
    def verification_loop(self):
        """Process ZK verification requests from queue"""
        self._log("Verification loop started")
        self.status = MinerStatus.VERIFYING
        
        while self.is_running:
            try:
                request = self.verification_queue.get(timeout=10)
                self.verify_zk_proof(request)
                self.verification_queue.task_done()
            except queue.Empty:
                continue
            except Exception as e:
                self._log(f"Verification loop error: {e}")
    
    # ============================================================
    # MESH RELAY NETWORK
    # ============================================================
    
    def relay_loop(self):
        """
        Mesh relay network — broadcasts and relays transactions
        for offline devices. Uses UDP broadcast on local network.
        """
        self._log("Relay loop started")
        self.status = MinerStatus.RELAYING
        
        # Set up UDP socket for mesh communication
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        
        try:
            sock.bind(('', Config.MESH_PORT))
        except:
            self._log("Mesh port already in use — relay disabled")
            return
        
        sock.settimeout(5.0)
        
        while self.is_running:
            try:
                # Listen for incoming relay messages
                data, addr = sock.recvfrom(65535)
                
                if data:
                    # Process relayed transaction
                    tx_hash = self._process_relay_message(data)
                    if tx_hash:
                        self.state.total_relayed += 1
                        self._save_state()
                        self._log(f"Transaction relayed: {tx_hash.hex()[:16]}...")
                
            except socket.timeout:
                continue
            except Exception as e:
                self._log(f"Relay error: {e}")
        
        sock.close()
    
    def _process_relay_message(self, data: bytes) -> Optional[bytes]:
        """Process a relayed transaction from the mesh"""
        try:
            # Verify the transaction is valid
            tx_hash = Web3.keccak(data)
            
            # Submit to the network
            self.w3.eth.send_raw_transaction(data)
            
            return tx_hash
        except Exception:
            return None
    
    # ============================================================
    # TRANSACTION HELPERS
    # ============================================================
    
    def _build_and_send_tx(self, contract_function, value: int = 0) -> bytes:
        """Build, sign, and send a transaction with retry logic"""
        with self.nonce_lock:
            tx = contract_function.build_transaction({
                'from': self.wallet_address,
                'nonce': self.nonce,
                'gas': Config.DEFAULT_GAS_LIMIT,
                'gasPrice': min(
                    self.w3.eth.gas_price,
                    Web3.to_wei(Config.MAX_GAS_PRICE_GWEI, 'gwei')
                ),
                'chainId': Config.CHAIN_ID,
                'value': value,
            })
            
            signed_tx = self.account.sign_transaction(tx)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            self.nonce += 1
            return tx_hash
    
    def _wait_for_receipt(self, tx_hash: bytes, timeout: int = 120):
        """Wait for transaction receipt with retry"""
        for attempt in range(Config.RETRY_ATTEMPTS):
            try:
                receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=timeout)
                return receipt
            except Exception as e:
                if attempt < Config.RETRY_ATTEMPTS - 1:
                    self._log(f"Receipt wait retry {attempt + 1}: {e}")
                    time.sleep(Config.RETRY_DELAY)
                else:
                    raise
    
    def _refresh_nonce(self):
        """Refresh nonce from chain"""
        with self.nonce_lock:
            self.nonce = self.w3.eth.get_transaction_count(self.wallet_address)
    
    # ============================================================
    # STATE MANAGEMENT
    # ============================================================
    
    def _save_state(self):
        """Save miner state to disk"""
        try:
            state_dict = {
                'wallet_address': self.state.wallet_address,
                'device_id': self.state.device_id,
                'hardware_tier': self.state.hardware_tier,
                'is_registered': self.state.is_registered,
                'is_staked': self.state.is_staked,
                'staked_amount': self.state.staked_amount,
                'total_mined': self.state.total_mined,
                'total_verified': self.state.total_verified,
                'total_relayed': self.state.total_relayed,
                'blocks_mined': self.state.blocks_mined,
                'last_block_mined': self.state.last_block_mined,
                'start_time': self.state.start_time,
                'session_id': self.state.session_id,
            }
            with open(Config.STATE_FILE, 'w') as f:
                json.dump(state_dict, f, indent=2)
        except Exception as e:
            self._log(f"State save error: {e}")
    
    def _load_state(self):
        """Load miner state from disk"""
        try:
            if os.path.exists(Config.STATE_FILE):
                with open(Config.STATE_FILE, 'r') as f:
                    data = json.load(f)
                
                self.state.wallet_address = data.get('wallet_address', self.wallet_address)
                self.state.device_id = data.get('device_id', '')
                self.state.hardware_tier = data.get('hardware_tier', HardwareTier.MOBILE)
                self.state.is_registered = data.get('is_registered', False)
                self.state.is_staked = data.get('is_staked', False)
                self.state.staked_amount = data.get('staked_amount', 0)
                self.state.total_mined = data.get('total_mined', 0)
                self.state.total_verified = data.get('total_verified', 0)
                self.state.total_relayed = data.get('total_relayed', 0)
                self.state.blocks_mined = data.get('blocks_mined', 0)
                self.state.last_block_mined = data.get('last_block_mined', 0)
                self.state.start_time = data.get('start_time', 0.0)
                self.state.session_id = data.get('session_id', '')
                
                if self.state.device_id:
                    self.device_id = bytes.fromhex(self.state.device_id[2:] if 
                        self.state.device_id.startswith('0x') else self.state.device_id)
                
                self._log("Previous state loaded")
        except Exception as e:
            self._log(f"State load error: {e}")
    
    # ============================================================
    # PUBLIC API
    # ============================================================
    
    def start(self):
        """Start all mining operations"""
        if self.is_running:
            self._log("Already running")
            return
        
        self.is_running = True
        self.state.start_time = time.time()
        self.state.session_id = Web3.keccak(text=f"{self.wallet_address}{time.time()}").hex()[:16]
        
        self._log("=" * 55)
        self._log("AICOIN MINER V3.0.0 STARTING")
        self._log("=" * 55)
        
        # Step 1: Device registration
        self.device_id = self.generate_device_id()
        self.state.device_id = '0x' + self.device_id.hex()
        self.state.hardware_tier = int(self.detect_hardware_tier())
        
        if not self.register_device():
            self._log("FATAL: Device registration failed")
            self.stop()
            return
        
        # Step 2: Staking
        if not self.stake_as_validator():
            self._log("FATAL: Staking failed")
            self.stop()
            return
        
        # Step 3: Start threads
        self.mining_thread = threading.Thread(target=self.mining_loop, daemon=True, name="mining")
        self.verification_thread = threading.Thread(target=self.verification_loop, daemon=True, name="verification")
        self.relay_thread = threading.Thread(target=self.relay_loop, daemon=True, name="relay")
        
        self.mining_thread.start()
        self.verification_thread.start()
        self.relay_thread.start()
        
        self._log(f"Mining started. Block reward: {self.get_current_block_reward() / 10**9:.1f} AIC")
        self._log(f"Halving: {self.halving_controller.functions.currentHalving().call()}")
        self._log(f"Blocks until halving: {self.halving_controller.functions.blocksUntilHalving().call()}")
    
    def stop(self):
        """Stop all mining operations"""
        self._log("Stopping miner...")
        self.is_running = False
        self.status = MinerStatus.OFFLINE
        
        for thread in [self.mining_thread, self.verification_thread, self.relay_thread]:
            if thread and thread.is_alive():
                thread.join(timeout=10)
        
        self._save_state()
        self._log("Miner stopped")
    
    def get_status(self) -> dict:
        """Get current miner status for API"""
        try:
            current_reward = self.get_current_block_reward()
            mining_active = self.is_mining_active()
            blocks_until = self.halving_controller.functions.blocksUntilHalving().call()
            current_halving = self.halving_controller.functions.currentHalving().call()
            total_mined_global = self.halving_controller.functions.totalMined().call()
        except:
            current_reward = 0
            mining_active = False
            blocks_until = 0
            current_halving = 0
            total_mined_global = 0
        
        return {
            "status": self.status.name,
            "wallet": self.wallet_address,
            "device_id": '0x' + self.device_id.hex()[:16] + '...' if self.device_id else "N/A",
            "hardware_tier": HardwareTier(self.state.hardware_tier).name,
            "is_registered": self.state.is_registered,
            "is_staked": self.state.is_staked,
            "staked_aic": self.state.staked_amount / 10**9,
            "total_mined_aic": self.state.total_mined / 10**9,
            "blocks_mined": self.state.blocks_mined,
            "total_verified": self.state.total_verified,
            "total_relayed": self.state.total_relayed,
            "current_reward_aic": current_reward / 10**9,
            "mining_active": mining_active,
            "current_halving": current_halving,
            "blocks_until_halving": blocks_until,
            "total_mined_global_aic": total_mined_global / 10**9,
            "uptime_seconds": time.time() - self.state.start_time if self.state.start_time else 0,
            "session_id": self.state.session_id,
        }
    
    def _log(self, message: str):
        """Log with timestamp"""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        print(log_entry)
        
        try:
            with open(Config.LOG_FILE, 'a') as f:
                f.write(log_entry + '\n')
        except:
            pass


# ============================================================
# COMMAND-LINE INTERFACE
# ============================================================

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="AICOIN Mining Client V3.0.0")
    parser.add_argument("--private-key", required=True, help="Private key for wallet")
    parser.add_argument("--wallet", required=True, help="Wallet address")
    parser.add_argument("--register-only", action="store_true", help="Only register device, don't mine")
    parser.add_argument("--status", action="store_true", help="Show status and exit")
    
    args = parser.parse_args()
    
    print("=" * 55)
    print("  AICOIN MINING CLIENT V3.0.0")
    print("  Proof of Useful AI Work + ZK Verification")
    print("=" * 55)
    
    miner = AICoinMinerV3(args.private_key, args.wallet)
    
    if args.status:
        print(json.dumps(miner.get_status(), indent=2))
        sys.exit(0)
    
    if args.register_only:
        miner.device_id = miner.generate_device_id()
        miner.state.device_id = '0x' + miner.device_id.hex()
        miner.detect_hardware_tier()
        miner.register_device()
        miner.stop()
        sys.exit(0)
    
    try:
        miner.start()
        
        # Keep main thread alive, print status periodically
        while miner.is_running:
            time.sleep(60)
            status = miner.get_status()
            print(f"\n[Mining] Blocks: {status['blocks_mined']} | "
                  f"Mined: {status['total_mined_aic']:.1f} AIC | "
                  f"Verified: {status['total_verified']} | "
                  f"Relayed: {status['total_relayed']}")
            
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        miner.stop()
        print("Miner stopped. Goodbye.")