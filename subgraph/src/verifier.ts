// ============================================================
// src/verifier.ts
// ============================================================
import { MinerStaked, MinerPenalized, ProofSubmitted } from "../generated/Verifier/Verifier"
import { VerifierStat } from "../generated/schema"
import { BigInt } from "@graphprotocol/graph-ts"

export function handleMinerStaked(event: MinerStaked): void {
  let stat = VerifierStat.load("global")
  if (!stat) {
    stat = new VerifierStat("global")
    stat.totalStaked = BigInt.fromI32(0)
    stat.totalSlashed = BigInt.fromI32(0)
    stat.totalProofsVerified = BigInt.fromI32(0)
  }
  stat.totalStaked = stat.totalStaked.plus(event.params.amount)
  stat.save()
}

export function handleMinerPenalized(event: MinerPenalized): void {
  let stat = VerifierStat.load("global")
  if (stat) {
    stat.totalSlashed = stat.totalSlashed.plus(event.params.slashAmount)
    stat.save()
  }
}

export function handleProofSubmitted(event: ProofSubmitted): void {
  let stat = VerifierStat.load("global")
  if (stat) {
    stat.totalProofsVerified = stat.totalProofsVerified.plus(BigInt.fromI32(1))
    stat.save()
  }
}