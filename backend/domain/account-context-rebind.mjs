"use strict";

/**
 * PAY54 Batch20 / 757 — trusted-session account-rebinding preflight.
 *
 * This contract accepts only trusted-backend inputs and returns a nonexecuting
 * transition plan. Session issuance, CSRF validation, revocation, PostgreSQL
 * RLS and audit persistence MUST be implemented by independent trusted
 * services before an account change endpoint can be made available.
 *
 * No cookies/tokens or customer payloads are logged or returned.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid=x=>typeof x==="string"&&UUID.test(x);

export function planPay54TrustedAccountRebind({
  selectionProposal,
  currentSessionFromTrustedStore,
  serverTimeMs,
  authoritativeSessionVersion
}={}){
  if(selectionProposal?.schema!=="pay54.account-selection-proposal.v1"||
     selectionProposal.productionReady!==false||
     selectionProposal.browserAccountSwitchCompleted!==false||
     selectionProposal.financialOperationAuthorised!==false||
     !isUuid(selectionProposal.accountId)||
     !isUuid(selectionProposal.principalId)){
    throw new Error("PAY54_SESSION_REBIND_PROPOSAL_INVALID");
  }
  const session=currentSessionFromTrustedStore;
  if(!session||typeof session!=="object"||
     !isUuid(session.sessionId)||
     !isUuid(session.principalId)||
     session.principalId.toLowerCase()!==selectionProposal.principalId||
     session.status!=="ACTIVE"||
     !Number.isSafeInteger(session.version)||
     session.version<1||
     !Number.isSafeInteger(authoritativeSessionVersion)||
     session.version!==authoritativeSessionVersion||
     !Number.isFinite(serverTimeMs)||
     !Number.isFinite(session.expiresAtMs)||
     session.expiresAtMs<=serverTimeMs){
    throw new Error("PAY54_SESSION_REBIND_ACCESS_DENIED");
  }
  if(session.activeAccountId!==null&&session.activeAccountId!==undefined&&
     !isUuid(session.activeAccountId)){
    throw new Error("PAY54_SESSION_REBIND_ACCESS_DENIED");
  }
  if(session.activeAccountId?.toLowerCase()===selectionProposal.accountId){
    throw new Error("PAY54_SESSION_REBIND_NO_OP");
  }
  return Object.freeze({
    schema:"pay54.account-rebind-preflight.v1",
    candidateAccountId:selectionProposal.accountId,
    fromSessionId:session.sessionId.toLowerCase(),
    expectedSessionVersion:session.version,
    requiresAtomicCompareAndSwap:true,
    requiresFreshSessionIdAndCsrfBinding:true,
    requiresOldSessionRevocation:true,
    requiresTrustedRlsScopeReset:true,
    requiresCommitAudit:true,
    replayFenceValidated:false,
    csrfValidated:false,
    sessionRebound:false,
    productionReady:false
  });
}
