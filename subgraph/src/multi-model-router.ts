// ============================================================
// subgraph/src/multi-model-router.ts
// ============================================================
import { ProviderRegistered, RouteAdded, RouteRemoved } from "../generated/MultiModelRouter/MultiModelRouter";
import { Provider, ModelRoute } from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";

export function handleProviderRegistered(event: ProviderRegistered): void {
  let provider = new Provider(event.params.provider);
  provider.address = event.params.provider;
  provider.name = event.params.name;
  provider.endpointURI = event.params.endpointURI;
  provider.active = true;
  provider.totalRequests = BigInt.fromI32(0);
  provider.totalTokensServed = BigInt.fromI32(0);
  provider.registeredAt = event.block.timestamp;
  provider.blockNumber = event.block.number;
  provider.transactionHash = event.transaction.hash;
  provider.save();
}

export function handleRouteAdded(event: RouteAdded): void {
  let route = new ModelRoute(event.params.modelId);
  route.modelId = event.params.modelId;
  route.provider = event.params.provider.toHexString();
  route.category = event.params.category;
  route.active = true;
  route.addedAt = event.block.timestamp;
  route.blockNumber = event.block.number;
  route.transactionHash = event.transaction.hash;
  route.save();
}

export function handleRouteRemoved(event: RouteRemoved): void {
  let route = ModelRoute.load(event.params.modelId);
  if (!route) return;
  route.active = false;
  route.save();
}