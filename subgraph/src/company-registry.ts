import { 
  CompanyRegistered, CompanyAutoVerified, EarningsAdded, 
  TrustScoreUpdated, CompanySlashed, DisputeFiled, DisputeResolved 
} from "../generated/CompanyRegistry/CompanyRegistry"
import { Company, EarningsUpdate, Dispute } from "../generated/schema"
import { BigInt, Bytes } from "@graphprotocol/graph-ts"

export function handleCompanyRegistered(event: CompanyRegistered): void {
  let entity = new Company(event.params.wallet)
  entity.name = event.params.name
  entity.publicKey = event.params.publicKey
  entity.verified = false
  entity.trustScore = 0
  entity.stakedAmount = event.params.stakedAmount
  entity.registeredAt = event.block.timestamp
  entity.totalEarned = BigInt.fromI32(0)
  entity.totalRequestsServed = BigInt.fromI32(0)
  entity.totalDisputes = 0
  entity.resolvedDisputes = 0
  entity.active = true
  entity.save()
}

export function handleCompanyAutoVerified(event: CompanyAutoVerified): void {
  let company = Company.load(event.params.wallet)
  if (company) {
    company.verified = true
    company.trustScore = event.params.trustScore.toI32()
    company.save()
  }
}

export function handleEarningsAdded(event: EarningsAdded): void {
  let company = Company.load(event.params.company)
  if (company) {
    company.totalEarned = company.totalEarned.plus(event.params.amount)
    company.totalRequestsServed = company.totalRequestsServed.plus(BigInt.fromI32(1))
    company.save()
  }
  
  let update = new EarningsUpdate(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  update.company = event.params.company
  update.amount = event.params.amount
  update.timestamp = event.block.timestamp
  update.save()
}

export function handleTrustScoreUpdated(event: TrustScoreUpdated): void {
  let company = Company.load(event.params.company)
  if (company) {
    company.trustScore = event.params.newScore.toI32()
    company.save()
  }
}

export function handleCompanySlashed(event: CompanySlashed): void {
  let company = Company.load(event.params.company)
  if (company) {
    company.stakedAmount = company.stakedAmount.minus(event.params.slashAmount)
    company.trustScore = 0
    company.verified = false
    company.save()
  }
}

export function handleDisputeFiled(event: DisputeFiled): void {
  let dispute = new Dispute(event.params.disputeId)
  dispute.disputeId = event.params.disputeId
  dispute.company = event.params.company
  dispute.complainant = event.params.complainant
  dispute.resolved = false
  dispute.filedAt = event.block.timestamp
  dispute.save()
  
  let company = Company.load(event.params.company)
  if (company) {
    company.totalDisputes += 1
    company.save()
  }
}

export function handleDisputeResolved(event: DisputeResolved): void {
  let dispute = Dispute.load(event.params.disputeId)
  if (dispute) {
    dispute.resolved = true
    dispute.upheld = event.params.upheld
    dispute.resolvedAt = event.block.timestamp
    dispute.save()
  }
}