"use client";

import { useReadContract } from "wagmi";
import { useAccount } from "wagmi";
import { AGENT_WALLET_ADDRESS } from "@/lib/contracts";
import { formatUnits } from "viem";

const AGENT_WALLET_ABI = [
  {
    name: "getBusinessAgents",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "business", type: "address" }],
    outputs: [{ type: "address[]" }],
  },
  {
    name: "getAgentConfig",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentWallet", type: "address" }],
    outputs: [
      { name: "balance", type: "uint256" },
      { name: "minBalance", type: "uint256" },
      { name: "refillAmount", type: "uint256" },
      { name: "businessOwner", type: "address" },
      { name: "active", type: "bool" },
      { name: "totalSpent", type: "uint256" },
      { name: "totalTransactions", type: "uint256" },
    ],
  },
] as const;

export function useBusinessAgents() {
  const { address } = useAccount();
  
  return useReadContract({
    address: AGENT_WALLET_ADDRESS as `0x${string}`,
    abi: AGENT_WALLET_ABI,
    functionName: "getBusinessAgents",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address },
  });
}

export function useAgentConfig(agentAddress?: string) {
  return useReadContract({
    address: AGENT_WALLET_ADDRESS as `0x${string}`,
    abi: AGENT_WALLET_ABI,
    functionName: "getAgentConfig",
    args: agentAddress ? [agentAddress as `0x${string}`] : undefined,
    query: { enabled: !!agentAddress },
  });
}

export function formatAgentData(rawConfig: any) {
  if (!rawConfig) return null;
  const [balance, minBalance, refillAmount, businessOwner, active, totalSpent, totalTransactions] = rawConfig as [bigint, bigint, bigint, string, boolean, bigint, bigint];
  return {
    balance: Number(formatUnits(balance, 9)),
    minBalance: Number(formatUnits(minBalance, 9)),
    refillAmount: Number(formatUnits(refillAmount, 9)),
    businessOwner,
    active,
    totalSpent: Number(formatUnits(totalSpent, 9)),
    totalTransactions: Number(totalTransactions),
  };
}