// ============================================================
// subgraph/src/p2p-escrow.ts
// ============================================================
import {
  TradeCreated, TradeTaken, PaymentSubmitted, TradeConfirmed,
  DisputeRaised, DisputeResolved, TradeReleased, TradeCancelled,
  ReputationUpdated
} from "../generated/P2PEscrow/P2PEscrow";
import { Trade, Dispute, UserReputation } from "../generated/schema";
import { BigInt, store } from "@graphprotocol/graph-ts";

function getOrCreateReputation(address: string): UserReputation {
  let rep = UserReputation.load(address);
  if (!rep) {
    rep = new UserReputation(address);
    rep.address = address;
    rep.score = BigInt.fromI32(0);
    rep.completedTrades = BigInt.fromI32(0);
    rep.disputedTrades = BigInt.fromI32(0);
    rep.totalStaked = BigInt.fromI32(0);
    rep.save();
  }
  return rep;
}

export function handleTradeCreated(event: TradeCreated): void {
  let trade = new Trade(event.params.tradeId.toString());
  trade.tradeId = event.params.tradeId;
  trade.seller = event.params.seller;
  trade.buyer = null;
  trade.amount = event.params.amount;
  trade.paymentMethod = event.params.paymentMethod;
  trade.sellerContact = "";
  trade.status = "OPEN";
  trade.stake = BigInt.fromI32(0);
  trade.proofData = "";
  trade.createdAt = event.block.timestamp;
  trade.updatedAt = event.block.timestamp;
  trade.disputeId = BigInt.fromI32(0);
  trade.blockNumber = event.block.number;
  trade.transactionHash = event.transaction.hash;
  trade.save();
}

export function handleTradeTaken(event: TradeTaken): void {
  let trade = Trade.load(event.params.tradeId.toString());
  if (!trade) return;
  trade.buyer = event.params.buyer;
  trade.status = "TAKEN";
  trade.updatedAt = event.block.timestamp;
  trade.save();
}

export function handlePaymentSubmitted(event: PaymentSubmitted): void {
  let trade = Trade.load(event.params.tradeId.toString());
  if (!trade) return;
  trade.proofData = event.params.proofData;
  trade.status = "PAID";
  trade.updatedAt = event.block.timestamp;
  trade.save();
}

export function handleTradeConfirmed(event: TradeConfirmed): void {
  let trade = Trade.load(event.params.tradeId.toString());
  if (!trade) return;
  trade.status = "CONFIRMED";
  trade.updatedAt = event.block.timestamp;
  trade.save();
}

export function handleTradeReleased(event: TradeReleased): void {
  let trade = Trade.load(event.params.tradeId.toString());
  if (!trade) return;
  trade.status = "RELEASED";
  trade.updatedAt = event.block.timestamp;
  trade.save();

  if (trade.seller) {
    let sellerRep = getOrCreateReputation(trade.seller.toHexString());
    sellerRep.score = sellerRep.score.plus(BigInt.fromI32(1));
    sellerRep.completedTrades = sellerRep.completedTrades.plus(BigInt.fromI32(1));
    sellerRep.save();
  }
  if (trade.buyer) {
    let buyerRep = getOrCreateReputation(trade.buyer.toHexString());
    buyerRep.score = buyerRep.score.plus(BigInt.fromI32(1));
    buyerRep.completedTrades = buyerRep.completedTrades.plus(BigInt.fromI32(1));
    buyerRep.save();
  }
}

export function handleTradeCancelled(event: TradeCancelled): void {
  let trade = Trade.load(event.params.tradeId.toString());
  if (!trade) return;
  trade.status = "CANCELLED";
  trade.updatedAt = event.block.timestamp;
  trade.save();
}

export function handleDisputeRaised(event: DisputeRaised): void {
  let trade = Trade.load(event.params.tradeId.toString());
  if (!trade) return;
  trade.status = "DISPUTED";
  trade.disputeId = event.params.disputeId;
  trade.updatedAt = event.block.timestamp;
  trade.save();

  let dispute = new Dispute(event.params.disputeId.toString());
  dispute.disputeId = event.params.disputeId;
  dispute.trade = event.params.tradeId.toString();
  dispute.reason = event.params.reason;
  dispute.resolved = false;
  dispute.sellerWins = null;
  dispute.resolution = "";
  dispute.createdAt = event.block.timestamp;
  dispute.blockNumber = event.block.number;
  dispute.transactionHash = event.transaction.hash;
  dispute.save();

  if (trade.seller) {
    let sellerRep = getOrCreateReputation(trade.seller.toHexString());
    sellerRep.disputedTrades = sellerRep.disputedTrades.plus(BigInt.fromI32(1));
    sellerRep.save();
  }
  if (trade.buyer) {
    let buyerRep = getOrCreateReputation(trade.buyer.toHexString());
    buyerRep.disputedTrades = buyerRep.disputedTrades.plus(BigInt.fromI32(1));
    buyerRep.save();
  }
}

export function handleDisputeResolved(event: DisputeResolved): void {
  let trade = Trade.load(event.params.tradeId.toString());
  if (!trade) return;
  trade.status = "RELEASED";
  trade.updatedAt = event.block.timestamp;
  trade.save();

  let dispute = Dispute.load(trade.disputeId.toString());
  if (dispute) {
    dispute.resolved = true;
    dispute.sellerWins = event.params.sellerWins;
    dispute.resolution = event.params.resolution;
    dispute.save();
  }

  if (trade.seller) {
    let sellerRep = getOrCreateReputation(trade.seller.toHexString());
    if (event.params.sellerWins) {
      sellerRep.score = sellerRep.score.plus(BigInt.fromI32(2));
    } else {
      sellerRep.score = sellerRep.score.minus(BigInt.fromI32(5));
    }
    sellerRep.save();
  }
  if (trade.buyer) {
    let buyerRep = getOrCreateReputation(trade.buyer.toHexString());
    if (!event.params.sellerWins) {
      buyerRep.score = buyerRep.score.plus(BigInt.fromI32(2));
    } else {
      buyerRep.score = buyerRep.score.minus(BigInt.fromI32(5));
    }
    buyerRep.save();
  }
}

export function handleReputationUpdated(event: ReputationUpdated): void {
  let rep = getOrCreateReputation(event.params.trader.toHexString());
  rep.score = event.params.newScore;
  rep.save();
}