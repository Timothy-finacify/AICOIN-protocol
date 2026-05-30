// ============================================================
// subgraph/src/batch-payment-router.ts
// ============================================================
import { BatchProcessed } from "../generated/BatchPaymentRouter/BatchPaymentRouter";
import { BatchPayment, BatchPaymentStats } from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";

export function handleBatchProcessed(event: BatchProcessed): void {
  let b = new BatchPayment(event.transaction.hash.concatI32(event.logIndex.toI32()));
  b.payer = event.params.payer;
  b.count = event.params.count.toI32();
  b.gasSaved = event.params.totalGasSaved;
  b.timestamp = event.block.timestamp;
  b.blockNumber = event.block.number;
  b.transactionHash = event.transaction.hash;
  b.save();

  let stats = BatchPaymentStats.load("global");
  if (!stats) {
    stats = new BatchPaymentStats("global");
    stats.totalBatched = BigInt.fromI32(0);
    stats.totalGasSaved = BigInt.fromI32(0);
    stats.totalBatches = BigInt.fromI32(0);
    stats.save();
  }
  stats.totalBatched = stats.totalBatched.plus(BigInt.fromI32(event.params.count.toI32()));
  stats.totalGasSaved = stats.totalGasSaved.plus(event.params.totalGasSaved);
  stats.totalBatches = stats.totalBatches.plus(BigInt.fromI32(1));
  stats.save();
}