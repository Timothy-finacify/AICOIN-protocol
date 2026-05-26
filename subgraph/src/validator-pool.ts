// ============================================================
// src/validator-pool.ts
// ============================================================
import { ValidatorStaked, ValidatorUnstaked, BlockRewardMinted, ValidatorPaid } from "../generated/ValidatorPool/ValidatorPool"
import { Validator } from "../generated/schema"
import { BigInt } from "@graphprotocol/graph-ts"

export function handleValidatorStaked(event: ValidatorStaked): void {
  let validator = Validator.load(event.params.validator)
  if (!validator) {
    validator = new Validator(event.params.validator)
    validator.stakedAmount = BigInt.fromI32(0)
    validator.totalEarned = BigInt.fromI32(0)
    validator.active = true
    validator.registeredAt = event.block.timestamp
    validator.lastRewardBlock = BigInt.fromI32(0)
  }
  validator.stakedAmount = validator.stakedAmount.plus(event.params.amount)
  validator.active = true
  validator.save()
}

export function handleValidatorUnstaked(event: ValidatorUnstaked): void {
  let validator = Validator.load(event.params.validator)
  if (validator) {
    validator.stakedAmount = validator.stakedAmount.minus(event.params.amount)
    if (validator.stakedAmount.equals(BigInt.fromI32(0))) {
      validator.active = false
    }
    validator.save()
  }
}

export function handleBlockRewardMinted(event: BlockRewardMinted): void {
  let validator = Validator.load(event.params.validator)
  if (validator) {
    validator.totalEarned = validator.totalEarned.plus(event.params.amount)
    validator.lastRewardBlock = event.block.number
    validator.save()
  }
}

export function handleValidatorPaid(event: ValidatorPaid): void {
  let validator = Validator.load(event.params.validator)
  if (validator) {
    validator.totalEarned = validator.totalEarned.plus(event.params.feeAmount).plus(event.params.rewardAmount)
    validator.save()
  }
}