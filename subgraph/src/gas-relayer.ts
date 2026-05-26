// ============================================================
// src/gas-relayer.ts
// ============================================================
import { GasFundCollected, GasRefunded } from "../generated/GasRelayerFund/GasRelayerFund"
import { GasRelayerStat } from "../generated/schema"
import { BigInt } from "@graphprotocol/graph-ts"

export function handleGasFundCollected(event: GasFundCollected): void {
  let stat = GasRelayerStat.load("global")
  if (!stat) {
    stat = new GasRelayerStat("global")
    stat.totalCollected = BigInt.fromI32(0)
    stat.totalSpent = BigInt.fromI32(0)
    stat.balance = BigInt.fromI32(0)
  }
  stat.totalCollected = stat.totalCollected.plus(event.params.amount)
  stat.balance = stat.totalCollected.minus(stat.totalSpent)
  stat.save()
}

export function handleGasRefunded(event: GasRefunded): void {
  let stat = GasRelayerStat.load("global")
  if (stat) {
    stat.totalSpent = stat.totalSpent.plus(event.params.amount)
    stat.balance = stat.totalCollected.minus(stat.totalSpent)
    stat.save()
  }
}