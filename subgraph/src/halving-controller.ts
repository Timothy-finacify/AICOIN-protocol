// ============================================================
// src/halving-controller.ts
// ============================================================
import { HalvingExecuted, BlockRewardMinted, MiningEnded } from "../generated/HalvingController/HalvingController"
import { HalvingStat } from "../generated/schema"
import { BigInt } from "@graphprotocol/graph-ts"

export function handleHalvingExecuted(event: HalvingExecuted): void {
  let stat = HalvingStat.load("global")
  if (!stat) {
    stat = new HalvingStat("global")
    stat.currentHalving = 0
    stat.blockReward = BigInt.fromI32(0)
    stat.totalMined = BigInt.fromI32(0)
    stat.nextHalvingBlock = BigInt.fromI32(0)
    stat.miningActive = true
  }
  stat.currentHalving = event.params.halvingNumber.toI32()
  stat.blockReward = event.params.newReward
  stat.nextHalvingBlock = BigInt.fromI32(0)
  stat.save()
}

export function handleBlockRewardMinted(event: BlockRewardMinted): void {
  let stat = HalvingStat.load("global")
  if (stat) {
    stat.totalMined = stat.totalMined.plus(event.params.amount)
    stat.save()
  }
}

export function handleMiningEnded(event: MiningEnded): void {
  let stat = HalvingStat.load("global")
  if (stat) {
    stat.miningActive = false
    stat.blockReward = BigInt.fromI32(0)
    stat.save()
  }
}