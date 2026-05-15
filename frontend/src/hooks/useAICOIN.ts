"use client";

import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { AICOIN_ADDRESS, VERIFIER_ADDRESS } from "@/lib/contracts";

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
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    name: "BURN_PERCENT",
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

export function useMinerStats(address?: string) {
  const { data: stake } = useReadContract({
    address: VERIFIER_ADDRESS as `0x${string}`,
    abi: [{
      name: "stakes",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "", type: "address" }],
      outputs: [{ type: "uint256" }],
    }],
    functionName: "stakes",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address },
  });

  const { data: reputation } = useReadContract({
    address: VERIFIER_ADDRESS as `0x${string}`,
    abi: [{
      name: "getMinerReputation",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "miner", type: "address" }],
      outputs: [{ type: "int256" }],
    }],
    functionName: "getMinerReputation",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address },
  });

  return {
    stake: stake ? Number(formatUnits(stake as bigint, 9)) : 0,
    reputation: reputation ? Number(reputation) : 0,
    isStaked: stake ? (stake as bigint) >= BigInt("1000000000000") : false,
  };
}