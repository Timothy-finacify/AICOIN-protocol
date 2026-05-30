// ============================================================
// subgraph/src/aic-bridge.ts
// ============================================================
import { BridgeRequested, BridgeCompleted, ChainAdded } from "../generated/AICBridge/AICBridge";
import { BridgeRequest, BridgeStats } from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";

export function handleBridgeRequested(event: BridgeRequested): void {
  let b = new BridgeRequest(event.params.requestId.toString());
  b.requestId = event.params.requestId;
  b.user = event.params.user;
  b.fromChain = event.params.fromChain;
  b.toChain = event.params.toChain;
  b.amount = event.params.amount;
  b.fee = event.params.fee;
  b.completed = false;
  b.createdAt = event.block.timestamp;
  b.blockNumber = event.block.number;
  b.transactionHash = event.transaction.hash;
  b.save();

  let stats = BridgeStats.load("global");
  if (!stats) {
    stats = new BridgeStats("global");
    stats.totalBridged = BigInt.fromI32(0);
    stats.totalFees = BigInt.fromI32(0);
    stats.totalRequests = BigInt.fromI32(0);
    stats.save();
  }
  stats.totalBridged = stats.totalBridged.plus(event.params.amount);
  stats.totalFees = stats.totalFees.plus(event.params.fee);
  stats.totalRequests = stats.totalRequests.plus(BigInt.fromI32(1));
  stats.save();
}

export function handleBridgeCompleted(event: BridgeCompleted): void {
  let b = BridgeRequest.load(event.params.requestId.toString());
  if (!b) return;
  b.completed = true;
  b.save();
}

export function handleChainAdded(event: ChainAdded): void {}