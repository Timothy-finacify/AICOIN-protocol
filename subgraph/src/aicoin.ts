import { Transfer, TokensBurned, BurnMilestone } from "../generated/AICOIN/AICOIN"
import { Transfer as TransferEntity, BurnStat, BurnMilestone as BurnMilestoneEntity } from "../generated/schema"
import { BigInt, Bytes } from "@graphprotocol/graph-ts"

export function handleTransfer(event: Transfer): void {
  let entity = new TransferEntity(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.from = event.params.from
  entity.to = event.params.to
  entity.amount = event.params.value
  entity.burned = BigInt.fromI32(0)
  entity.timestamp = event.block.timestamp
  entity.blockNumber = event.block.number
  entity.save()
}

export function handleTokensBurned(event: TokensBurned): void {
  let stat = BurnStat.load("global")
  if (!stat) {
    stat = new BurnStat("global")
    stat.totalBurned = BigInt.fromI32(0)
    stat.circulatingSupply = BigInt.fromI32(0)
    stat.dailyBurned = BigInt.fromI32(0)
    stat.lastUpdated = BigInt.fromI32(0)
  }
  stat.totalBurned = stat.totalBurned.plus(event.params.amount)
  stat.dailyBurned = event.params.amount
  stat.lastUpdated = event.block.timestamp
  stat.save()
}

export function handleBurnMilestone(event: BurnMilestone): void {
  let entity = new BurnMilestoneEntity(event.params.milestoneNumber.toString())
  entity.milestoneNumber = event.params.milestoneNumber.toI32()
  entity.totalBurned = event.params.totalBurned
  entity.timestamp = event.block.timestamp
  entity.save()
}