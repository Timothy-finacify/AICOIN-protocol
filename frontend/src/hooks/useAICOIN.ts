"use client";

import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { AICOIN_ADDRESS, VERIFIER_ADDRESS } from "@/lib/contracts";
import { MODEL_REGISTRY_ADDRESS, REQUEST_POOL_ADDRESS } from "@/lib/contracts";

const AICOIN_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "totalBurned",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

export function useAICoinBalance(address?: string) {
  return useReadContract({
    address: AICOIN_ADDRESS as `0x${string}`,
    abi: AICOIN_ABI,
    functionName: "balanceOf",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address },
  });
}

export function useTotalSupply() {
  return useReadContract({
    address: AICOIN_ADDRESS as `0x${string}`,
    abi: AICOIN_ABI,
    functionName: "totalSupply",
  });
}

export function useTotalBurned() {
  return useReadContract({
    address: AICOIN_ADDRESS as `0x${string}`,
    abi: AICOIN_ABI,
    functionName: "totalBurned",
  });
}

export function useMinerFullStatus(address?: string) {
  const { data } = useReadContract({
    address: VERIFIER_ADDRESS as `0x${string}`,
    abi: [{
      name: "getMinerStatus",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "minerAddress", type: "address" }],
      outputs: [
        { name: "stakeAmount", type: "uint256" },
        { name: "reputation", type: "int256" },
        { name: "isBanned", type: "bool" },
        { name: "offenseCount", type: "uint256" },
        { name: "consecutiveHonestDays", type: "uint256" },
        { name: "daysUntilRestoration", type: "uint256" },
      ],
    }],
    functionName: "getMinerStatus",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address },
  });

  if (!data) return null;
  
  const [stakeAmount, reputation, isBanned, offenseCount, honestDays, daysUntil] = data as [bigint, bigint, boolean, bigint, bigint, bigint];
  
  return {
    stakeAmount: Number(formatUnits(stakeAmount, 9)),
    reputation: Number(reputation),
    isBanned,
    offenseCount: Number(offenseCount),
    honestDays: Number(honestDays),
    daysUntilRestoration: Number(daysUntil),
  };
}

export function useMinimumStake() {
  const { data } = useReadContract({
    address: VERIFIER_ADDRESS as `0x${string}`,
    abi: [{ name: "getMinimumStake", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }],
    functionName: "getMinimumStake",
  });

  return data ? Number(formatUnits(data as bigint, 9)) : null;
}



const MODEL_REGISTRY_ABI = [
  {
    name: "getModelCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getModelsByTier",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tier", type: "uint8" }],
    outputs: [{ type: "bytes32[]" }],
  },
  {
    name: "getModel",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "modelId", type: "bytes32" }],
    outputs: [
      { name: "name", type: "string" },
      { name: "ipfsHash", type: "string" },
      { name: "company", type: "address" },
      { name: "minTier", type: "uint8" },
      { name: "minMemoryMB", type: "uint256" },
      { name: "pricePerRequest", type: "uint256" },
      { name: "active", type: "bool" },
    ],
  },
] as const;

const REQUEST_POOL_ABI = [
  {
    name: "getPendingRequestsByTier",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tier", type: "uint8" }],
    outputs: [{ type: "uint256[]" }],
  },
  {
    name: "getRequest",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "requestId", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "user", type: "address" },
      { name: "modelId", type: "bytes32" },
      { name: "inputDataHash", type: "string" },
      { name: "requiredTier", type: "uint8" },
      { name: "paymentAmount", type: "uint256" },
      { name: "assignedMiner", type: "address" },
      { name: "status", type: "uint8" },
      { name: "createdAt", type: "uint256" },
      { name: "resultHash", type: "bytes32" },
    ],
  },
  {
    name: "getMinerCompletedCount",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "miner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export function useModelCount() {
  return useReadContract({
    address: MODEL_REGISTRY_ADDRESS as `0x${string}`,
    abi: MODEL_REGISTRY_ABI,
    functionName: "getModelCount",
  });
}

export function useModelsByTier(tier: number) {
  return useReadContract({
    address: MODEL_REGISTRY_ADDRESS as `0x${string}`,
    abi: MODEL_REGISTRY_ABI,
    functionName: "getModelsByTier",
    args: [tier],
  });
}

export function useModelInfo(modelId?: string) {
  return useReadContract({
    address: MODEL_REGISTRY_ADDRESS as `0x${string}`,
    abi: MODEL_REGISTRY_ABI,
    functionName: "getModel",
    args: modelId ? [modelId as `0x${string}`] : undefined,
    query: { enabled: !!modelId },
  });
}

export function usePendingRequests(tier: number) {
  return useReadContract({
    address: REQUEST_POOL_ADDRESS as `0x${string}`,
    abi: REQUEST_POOL_ABI,
    functionName: "getPendingRequestsByTier",
    args: [tier],
  });
}

export function useMinerCompletedCount(address?: string) {
  return useReadContract({
    address: REQUEST_POOL_ADDRESS as `0x${string}`,
    abi: REQUEST_POOL_ABI,
    functionName: "getMinerCompletedCount",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address },
  });
}