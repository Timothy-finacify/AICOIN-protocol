// ============================================================
// src/treasury.ts
// ============================================================
import { FundsCollected, FundsWithdrawn, TreasuryFeeUpdated } from "../generated/Treasury/Treasury"
import { TreasuryStat } from "../generated/schema"
import { BigInt } from "@graphprotocol/graph-ts"

export function handleFundsCollected(event: FundsCollected): void {
  let stat = TreasuryStat.load("global")
  if (!stat) {
    stat = new TreasuryStat("global")
    stat.totalCollected = BigInt.fromI32(0)
    stat.totalWithdrawn = BigInt.fromI32(0)
    stat.currentFee = 110
    stat.balance = BigInt.fromI32(0)
  }
  stat.totalCollected = stat.totalCollected.plus(event.params.amount)
  stat.balance = stat.totalCollected.minus(stat.totalWithdrawn)
  stat.save()
}

export function handleFundsWithdrawn(event: FundsWithdrawn): void {
  let stat = TreasuryStat.load("global")
  if (stat) {
    stat.totalWithdrawn = stat.totalWithdrawn.plus(event.params.amount)
    stat.balance = stat.totalCollected.minus(stat.totalWithdrawn)
    stat.save()
  }
}

export function handleTreasuryFeeUpdated(event: TreasuryFeeUpdated): void {
  let stat = TreasuryStat.load("global")
  if (stat) {
    stat.currentFee = event.params.newFee.toI32()
    stat.save()
  }
}