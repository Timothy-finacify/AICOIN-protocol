 "use client";

import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import {
  AICOIN, VERIFIER, MODEL_REGISTRY, VALIDATOR_POOL,
  HALVING_CONTROLLER, MINING_RESERVE, DEVICE_REGISTRY,
  TREASURY, P2P_ESCROW, MULTI_MODEL_ROUTER, WITHDRAWAL_MANAGER,
  PAYMENT_VERIFIER
} from "@/lib/contracts";

// ============ AICOIN TOKEN ============
const AICOIN_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalBurned", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "circulatingSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export function useBalance(address?: string) {
  return useReadContract({ address: AICOIN as `0x${string}`, abi: AICOIN_ABI, functionName: "balanceOf", args: address ? [address as `0x${string}`] : undefined, query: { enabled: !!address } });
}

export function useTotalSupply() {
  return useReadContract({ address: AICOIN as `0x${string}`, abi: AICOIN_ABI, functionName: "totalSupply" });
}

export function useTotalBurned() {
  return useReadContract({ address: AICOIN as `0x${string}`, abi: AICOIN_ABI, functionName: "totalBurned" });
}

export function useCirculatingSupply() {
  return useReadContract({ address: AICOIN as `0x${string}`, abi: AICOIN_ABI, functionName: "circulatingSupply" });
}

// ============ VERIFIER ============
const VERIFIER_ABI = [
  { name: "getMinerStatus", type: "function", stateMutability: "view", inputs: [{ name: "minerAddress", type: "address" }], outputs: [{ name: "stakeAmount", type: "uint256" }, { name: "reputation", type: "int256" }, { name: "isBanned", type: "bool" }, { name: "offenseCount", type: "uint256" }, { name: "consecutiveHonestDays", type: "uint256" }, { name: "daysUntilRestoration", type: "uint256" }] },
] as const;

export function useMinerStatus(address?: string) {
  const { data } = useReadContract({ address: VERIFIER as `0x${string}`, abi: VERIFIER_ABI, functionName: "getMinerStatus", args: address ? [address as `0x${string}`] : undefined, query: { enabled: !!address } });
  if (!data) return null;
  const [stakeAmount, reputation, isBanned, offenseCount, honestDays, daysUntil] = data as [bigint, bigint, boolean, bigint, bigint, bigint];
  return { stakeAmount: Number(formatUnits(stakeAmount, 9)), reputation: Number(reputation), isBanned, offenseCount: Number(offenseCount), honestDays: Number(honestDays), daysUntilRestoration: Number(daysUntil) };
}

// ============ HALVING CONTROLLER ============
const HALVING_ABI = [
  { name: "getCurrentReward", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "currentHalving", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "miningActive", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { name: "blocksUntilHalving", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalMined", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export function useHalvingStats() {
  const { data: reward } = useReadContract({ address: HALVING_CONTROLLER as `0x${string}`, abi: HALVING_ABI, functionName: "getCurrentReward" });
  const { data: halving } = useReadContract({ address: HALVING_CONTROLLER as `0x${string}`, abi: HALVING_ABI, functionName: "currentHalving" });
  const { data: active } = useReadContract({ address: HALVING_CONTROLLER as `0x${string}`, abi: HALVING_ABI, functionName: "miningActive" });
  const { data: blocksUntil } = useReadContract({ address: HALVING_CONTROLLER as `0x${string}`, abi: HALVING_ABI, functionName: "blocksUntilHalving" });
  const { data: mined } = useReadContract({ address: HALVING_CONTROLLER as `0x${string}`, abi: HALVING_ABI, functionName: "totalMined" });
  return {
    reward: reward ? Number(formatUnits(reward as bigint, 9)) : 0,
    currentHalving: halving ? Number(halving) : 0,
    miningActive: active as boolean ?? true,
    blocksUntilHalving: blocksUntil ? Number(blocksUntil) : 0,
    totalMined: mined ? Number(formatUnits(mined as bigint, 9)) : 0,
  };
}

// ============ VALIDATOR POOL ============
const VALIDATOR_ABI = [
  { name: "getValidatorCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "getValidatorInfo", type: "function", stateMutability: "view", inputs: [{ name: "validator", type: "address" }], outputs: [{ name: "staked", type: "uint256" }, { name: "earned", type: "uint256" }, { name: "active", type: "bool" }] },
  { name: "totalStaked", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export function useValidatorCount() {
  return useReadContract({ address: VALIDATOR_POOL as `0x${string}`, abi: VALIDATOR_ABI, functionName: "getValidatorCount" });
}

export function useValidatorInfo(address?: string) {
  const { data } = useReadContract({ address: VALIDATOR_POOL as `0x${string}`, abi: VALIDATOR_ABI, functionName: "getValidatorInfo", args: address ? [address as `0x${string}`] : undefined, query: { enabled: !!address } });
  if (!data) return null;
  const [staked, earned, active] = data as [bigint, bigint, boolean];
  return { staked: Number(formatUnits(staked, 9)), earned: Number(formatUnits(earned, 9)), active };
}

export function useTotalStaked() {
  return useReadContract({ address: VALIDATOR_POOL as `0x${string}`, abi: VALIDATOR_ABI, functionName: "totalStaked" });
}

// ============ MINING RESERVE ============
const RESERVE_ABI = [
  { name: "totalReserved", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "getMonthlyReleaseAmount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export function useReserveStats() {
  const { data: reserved } = useReadContract({ address: MINING_RESERVE as `0x${string}`, abi: RESERVE_ABI, functionName: "totalReserved" });
  const { data: monthly } = useReadContract({ address: MINING_RESERVE as `0x${string}`, abi: RESERVE_ABI, functionName: "getMonthlyReleaseAmount" });
  return { reserved: reserved ? Number(formatUnits(reserved as bigint, 9)) : 0, monthlyRelease: monthly ? Number(formatUnits(monthly as bigint, 9)) : 0 };
}

// ============ DEVICE REGISTRY ============
const DEVICE_ABI = [
  { name: "isDeviceRecognized", type: "function", stateMutability: "view", inputs: [{ name: "deviceId", type: "bytes32" }], outputs: [{ type: "bool" }] },
  { name: "isDeviceBanned", type: "function", stateMutability: "view", inputs: [{ name: "deviceId", type: "bytes32" }], outputs: [{ type: "bool" }] },
] as const;

export function useDeviceRecognized(deviceId?: string) {
  return useReadContract({ address: DEVICE_REGISTRY as `0x${string}`, abi: DEVICE_ABI, functionName: "isDeviceRecognized", args: deviceId ? [deviceId as `0x${string}`] : undefined, query: { enabled: !!deviceId } });
}

export function useDeviceBanned(deviceId?: string) {
  return useReadContract({ address: DEVICE_REGISTRY as `0x${string}`, abi: DEVICE_ABI, functionName: "isDeviceBanned", args: deviceId ? [deviceId as `0x${string}`] : undefined, query: { enabled: !!deviceId } });
}

// ============ P2P ESCROW ============
const P2P_ABI = [
  { name: "trades", type: "function", stateMutability: "view", inputs: [{ name: "", type: "uint256" }], outputs: [
    { name: "seller", type: "address" }, { name: "buyer", type: "address" }, { name: "amount", type: "uint256" },
    { name: "paymentMethod", type: "string" }, { name: "sellerContact", type: "string" },
    { name: "createdAt", type: "uint256" }, { name: "status", type: "uint8" },
    { name: "proofData", type: "string" }, { name: "disputeId", type: "uint256" }, { name: "stake", type: "uint256" }
  ]},
  { name: "tradeCounter", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "reputation", type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "stakedAmount", type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "completedTrades", type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "calculateStake", type: "function", stateMutability: "pure", inputs: [{ name: "_tradeAmount", type: "uint256" }], outputs: [{ type: "uint256" }] },
] as const;

export function useTrade(tradeId?: number) {
  return useReadContract({ address: P2P_ESCROW as `0x${string}`, abi: P2P_ABI, functionName: "trades", args: tradeId !== undefined ? [BigInt(tradeId)] : undefined, query: { enabled: tradeId !== undefined } });
}

export function useTradeCounter() {
  return useReadContract({ address: P2P_ESCROW as `0x${string}`, abi: P2P_ABI, functionName: "tradeCounter" });
}

export function useReputation(address?: string) {
  return useReadContract({ address: P2P_ESCROW as `0x${string}`, abi: P2P_ABI, functionName: "reputation", args: address ? [address as `0x${string}`] : undefined, query: { enabled: !!address } });
}

export function useP2PStakedAmount(address?: string) {
  return useReadContract({ address: P2P_ESCROW as `0x${string}`, abi: P2P_ABI, functionName: "stakedAmount", args: address ? [address as `0x${string}`] : undefined, query: { enabled: !!address } });
}

export function useCalculateStake(amount?: number) {
  return useReadContract({ address: P2P_ESCROW as `0x${string}`, abi: P2P_ABI, functionName: "calculateStake", args: amount ? [BigInt(amount * 1e9)] : undefined, query: { enabled: !!amount } });
}

// ============ MULTI-MODEL ROUTER ============
const ROUTER_ABI = [
  { name: "getProviderForModel", type: "function", stateMutability: "view", inputs: [{ name: "_modelId", type: "bytes32" }], outputs: [{ name: "provider", type: "address" }, { name: "endpointURI", type: "string" }] },
  { name: "getModelsByCategory", type: "function", stateMutability: "view", inputs: [{ name: "_category", type: "uint8" }], outputs: [{ type: "bytes32[]" }] },
  { name: "getProviderModels", type: "function", stateMutability: "view", inputs: [{ name: "_provider", type: "address" }], outputs: [{ type: "bytes32[]" }] },
  { name: "totalRoutes", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export function useProviderForModel(modelId?: string) {
  return useReadContract({ address: MULTI_MODEL_ROUTER as `0x${string}`, abi: ROUTER_ABI, functionName: "getProviderForModel", args: modelId ? [modelId as `0x${string}`] : undefined, query: { enabled: !!modelId } });
}

export function useModelsByCategory(category?: number) {
  return useReadContract({ address: MULTI_MODEL_ROUTER as `0x${string}`, abi: ROUTER_ABI, functionName: "getModelsByCategory", args: category !== undefined ? [category] : undefined, query: { enabled: category !== undefined } });
}

export function useProviderModels(provider?: string) {
  return useReadContract({ address: MULTI_MODEL_ROUTER as `0x${string}`, abi: ROUTER_ABI, functionName: "getProviderModels", args: provider ? [provider as `0x${string}`] : undefined, query: { enabled: !!provider } });
}

// ============ WITHDRAWAL MANAGER ============
const WITHDRAWAL_ABI = [
  { name: "pendingWithdrawals", type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "totalWithdrawn", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "MIN_WITHDRAWAL", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "MAX_WITHDRAWAL", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export function usePendingWithdrawals(address?: string) {
  return useReadContract({ address: WITHDRAWAL_MANAGER as `0x${string}`, abi: WITHDRAWAL_ABI, functionName: "pendingWithdrawals", args: address ? [address as `0x${string}`] : undefined, query: { enabled: !!address } });
}

export function useTotalWithdrawn() {
  return useReadContract({ address: WITHDRAWAL_MANAGER as `0x${string}`, abi: WITHDRAWAL_ABI, functionName: "totalWithdrawn" });
}

// ============ PAYMENT VERIFIER ============
const PAYMENT_VERIFIER_ABI = [
  { name: "validateProof", type: "function", stateMutability: "view", inputs: [{ name: "_tradeId", type: "uint256" }, { name: "_proofData", type: "string" }, { name: "_paymentMethod", type: "string" }], outputs: [{ type: "bool" }] },
  { name: "supportedPaymentMethods", type: "function", stateMutability: "view", inputs: [{ name: "", type: "string" }], outputs: [{ type: "bool" }] },
] as const;

export function useValidateProof(tradeId?: number, proofData?: string, method?: string) {
  return useReadContract({ address: PAYMENT_VERIFIER as `0x${string}`, abi: PAYMENT_VERIFIER_ABI, functionName: "validateProof", args: tradeId !== undefined && proofData && method ? [BigInt(tradeId), proofData, method] : undefined, query: { enabled: tradeId !== undefined && !!proofData && !!method } });
}

// ============ MODEL REGISTRY (read) ============
const MODEL_ABI = [
  { name: "getModelCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export function useModelCount() {
  return useReadContract({ address: MODEL_REGISTRY as `0x${string}`, abi: MODEL_ABI, functionName: "getModelCount" });
}