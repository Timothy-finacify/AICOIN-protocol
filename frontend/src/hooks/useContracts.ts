"use client";

import { useWriteContract, useAccount } from "wagmi";
import { sepolia } from "wagmi/chains";
import { AICOIN_ADDRESS, COMPANY_REGISTRY_ADDRESS } from "@/lib/contracts";
import { PAYMENT_ROUTER_ADDRESS } from "@/lib/contracts";

const AICOIN_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

const COMPANY_REGISTRY_ABI = [
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "publicKey", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

export function useTransferAIC() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();

  const transfer = (to: string, amount: bigint) => {
    writeContract({
      address: AICOIN_ADDRESS as `0x${string}`,
      abi: AICOIN_ABI,
      functionName: "transfer",
      args: [to as `0x${string}`, amount],
      chain: sepolia,
      account: address,
    });
  };

  return { transfer, hash, isPending, isSuccess, error };
}

export function useRegisterCompany() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();

  const register = (name: string, publicKey: string) => {
    writeContract({
      address: COMPANY_REGISTRY_ADDRESS as `0x${string}`,
      abi: COMPANY_REGISTRY_ABI,
      functionName: "register",
      args: [name, publicKey as `0x${string}`],
      chain: sepolia,
      account: address,
    });
  };

  return { register, hash, isPending, isSuccess, error };
}    



const PAYMENT_ROUTER_ABI = [
  {
    name: "routePayment",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "company", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export function useRoutePayment() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();

  const pay = (companyAddress: string, amountInNano: bigint) => {
    writeContract({
      address: PAYMENT_ROUTER_ADDRESS as `0x${string}`,
      abi: PAYMENT_ROUTER_ABI,
      functionName: "routePayment",
      args: [companyAddress as `0x${string}`, amountInNano],
      chain: sepolia,
      account: address,
    });
  };

  return { pay, hash, isPending, isSuccess, error };
}

import { SESSION_ADDRESS } from "@/lib/contracts";

export function useSessionApproval() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, isSuccess } = useWriteContract();

  const approveSession = (dapp: string, amount: bigint) => {
    writeContract({
      address: SESSION_ADDRESS as `0x${string}`,
      abi: [{ name: "approveSession", type: "function", inputs: [{ name: "dapp", type: "address" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" }],
      functionName: "approveSession",
      args: [dapp as `0x${string}`, amount],
      chain: sepolia,
      account: address,
    });
  };

  return { approveSession, hash, isPending, isSuccess };
}