// ============================================================
// src/session.ts
// ============================================================
import { SessionApproved, SessionSpent, SessionRevoked } from "../generated/Session/Session"
import { UserSession } from "../generated/schema"
import { BigInt, Bytes, crypto } from "@graphprotocol/graph-ts"

function getSessionId(user: Bytes, dapp: Bytes): Bytes {
  return crypto.keccak256(user.concat(dapp))
}

export function handleSessionApproved(event: SessionApproved): void {
  let sessionId = getSessionId(event.params.user, event.params.dapp)
  let session = new UserSession(sessionId)
  session.user = event.params.user
  session.dapp = event.params.dapp
  session.allowance = event.params.allowance
  session.spent = BigInt.fromI32(0)
  session.expiresAt = event.params.expiresAt
  session.active = true
  session.save()
}

export function handleSessionSpent(event: SessionSpent): void {
  let sessionId = getSessionId(event.params.user, event.params.dapp)
  let session = UserSession.load(sessionId)
  if (session) {
    session.spent = session.spent.plus(event.params.amount)
    session.save()
  }
}

export function handleSessionRevoked(event: SessionRevoked): void {
  let sessionId = getSessionId(event.params.user, event.params.dapp)
  let session = UserSession.load(sessionId)
  if (session) {
    session.active = false
    session.save()
  }
}