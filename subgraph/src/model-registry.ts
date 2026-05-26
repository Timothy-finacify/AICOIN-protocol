import { 
  ModelRegistered, ModelStatusUpdated, ModelRequestServed, 
  ModelUptimeUpdated, ModelDeprecated 
} from "../generated/ModelRegistry/ModelRegistry"
import { Model, ModelVersion } from "../generated/schema"
import { BigInt, Bytes } from "@graphprotocol/graph-ts"

export function handleModelRegistered(event: ModelRegistered): void {
  let entity = new Model(event.params.modelId)
  entity.name = event.params.name
  entity.version = event.params.version
  entity.company = event.params.company
  entity.category = event.params.category.toString()
  entity.inputPricePer1MTokens = event.params.inputPricePer1M
  entity.outputPricePer1MTokens = event.params.outputPricePer1M
  entity.autoPricing = false
  entity.totalRequestsServed = BigInt.fromI32(0)
  entity.totalInputTokensServed = BigInt.fromI32(0)
  entity.totalOutputTokensServed = BigInt.fromI32(0)
  entity.uptimePercent = 100
  entity.status = "ACTIVE"
  entity.registeredAt = event.block.timestamp
  entity.save()
}

export function handleModelStatusUpdated(event: ModelStatusUpdated): void {
  let model = Model.load(event.params.modelId)
  if (model) {
    model.status = event.params.newStatus.toString()
    model.save()
  }
}

export function handleModelRequestServed(event: ModelRequestServed): void {
  let model = Model.load(event.params.modelId)
  if (model) {
    model.totalRequestsServed = model.totalRequestsServed.plus(BigInt.fromI32(1))
    model.totalInputTokensServed = model.totalInputTokensServed.plus(event.params.inputTokens)
    model.totalOutputTokensServed = model.totalOutputTokensServed.plus(event.params.outputTokens)
    model.lastServedAt = event.block.timestamp
    model.save()
  }
}

export function handleModelUptimeUpdated(event: ModelUptimeUpdated): void {
  let model = Model.load(event.params.modelId)
  if (model) {
    model.uptimePercent = event.params.uptimePercent.toI32()
    model.save()
  }
}

export function handleModelDeprecated(event: ModelDeprecated): void {
  let oldModel = Model.load(event.params.oldModelId)
  if (oldModel) {
    oldModel.status = "DEPRECATED"
    oldModel.save()
  }
}