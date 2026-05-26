// ============================================================
// src/agent-wallet.ts
// ============================================================
import { AgentCreated, AgentSpent, AgentRefilled } from "../generated/AgentWallet/AgentWallet"
import { Agent } from "../generated/schema"
import { BigInt } from "@graphprotocol/graph-ts"

export function handleAgentCreated(event: AgentCreated): void {
  let agent = new Agent(event.params.agent)
  agent.businessOwner = event.params.business
  agent.balance = BigInt.fromI32(0)
  agent.minBalance = event.params.minBalance
  agent.refillAmount = event.params.refillAmount
  agent.totalSpent = BigInt.fromI32(0)
  agent.totalTransactions = BigInt.fromI32(0)
  agent.active = true
  agent.createdAt = event.block.timestamp
  agent.save()
}

export function handleAgentSpent(event: AgentSpent): void {
  let agent = Agent.load(event.params.agent)
  if (agent) {
    agent.balance = event.params.newBalance
    agent.totalSpent = agent.totalSpent.plus(event.params.amount)
    agent.totalTransactions = agent.totalTransactions.plus(BigInt.fromI32(1))
    agent.save()
  }
}

export function handleAgentRefilled(event: AgentRefilled): void {
  let agent = Agent.load(event.params.agent)
  if (agent) {
    agent.balance = event.params.newBalance
    agent.save()
  }
}