import { PaymentRouted } from "../generated/PaymentRouter/PaymentRouter"
import { Payment, PaymentStat, Company, Model } from "../generated/schema"
import { BigInt, Bytes } from "@graphprotocol/graph-ts"

export function handlePaymentRouted(event: PaymentRouted): void {
  let entity = new Payment(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.payer = event.params.payer
  entity.company = event.params.company
  entity.model = event.params.modelId
  entity.totalAmount = event.params.totalAmount
  entity.burnAmount = event.params.burnAmount
  entity.treasuryAmount = event.params.treasuryAmount
  entity.validatorAmount = event.params.validatorAmount
  entity.gasFundAmount = event.params.gasFundAmount
  entity.companyAmount = event.params.companyAmount
  entity.inputTokens = event.params.inputTokens
  entity.outputTokens = event.params.outputTokens
  entity.timestamp = event.block.timestamp
  entity.blockNumber = event.block.number
  entity.save()
  
  // Update daily payment stat
  let dayId = (event.block.timestamp.toI32() / 86400).toString()
  let stat = PaymentStat.load(dayId)
  if (!stat) {
    stat = new PaymentStat(dayId)
    stat.totalPayments = BigInt.fromI32(0)
    stat.totalVolume = BigInt.fromI32(0)
    stat.totalBurned = BigInt.fromI32(0)
    stat.period = "daily"
    stat.timestamp = event.block.timestamp
  }
  stat.totalPayments = stat.totalPayments.plus(BigInt.fromI32(1))
  stat.totalVolume = stat.totalVolume.plus(event.params.totalAmount)
  stat.totalBurned = stat.totalBurned.plus(event.params.burnAmount)
  stat.save()
}