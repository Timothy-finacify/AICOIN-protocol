// ============================================================
// subgraph/src/withdrawal-manager.ts
// ============================================================
import { WithdrawalRequested, WithdrawalExecuted } from "../generated/WithdrawalManager/WithdrawalManager";
import { Withdrawal, CompanyWithdrawalStats } from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";

function getOrCreateStats(company: string): CompanyWithdrawalStats {
  let stats = CompanyWithdrawalStats.load(company);
  if (!stats) {
    stats = new CompanyWithdrawalStats(company);
    stats.company = company;
    stats.totalWithdrawn = BigInt.fromI32(0);
    stats.pendingWithdrawals = BigInt.fromI32(0);
    stats.withdrawalCount = BigInt.fromI32(0);
    stats.save();
  }
  return stats;
}

export function handleWithdrawalRequested(event: WithdrawalRequested): void {
  let stats = getOrCreateStats(event.params.company.toHexString());
  stats.pendingWithdrawals = stats.pendingWithdrawals.plus(event.params.amount);
  stats.save();
}

export function handleWithdrawalExecuted(event: WithdrawalExecuted): void {
  let w = new Withdrawal(event.transaction.hash.concatI32(event.logIndex.toI32()));
  w.company = event.params.company;
  w.recipient = event.params.recipient;
  w.amount = event.params.amount;
  w.reason = "";
  w.executedAt = event.block.timestamp;
  w.blockNumber = event.block.number;
  w.transactionHash = event.transaction.hash;
  w.save();

  let stats = getOrCreateStats(event.params.company.toHexString());
  stats.totalWithdrawn = stats.totalWithdrawn.plus(event.params.amount);
  stats.pendingWithdrawals = stats.pendingWithdrawals.minus(event.params.amount);
  stats.withdrawalCount = stats.withdrawalCount.plus(BigInt.fromI32(1));
  stats.save();
}