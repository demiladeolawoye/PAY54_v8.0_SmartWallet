"use strict";

/**
 * PAY54 Batch20 / 759 — account-scoped cache transition plan.
 *
 * Bank/wallet, transactions, cards, recipients, activity, payment sources
 * and permissions MUST be invalidated on successful trusted session rebind.
 * This function does not touch browser storage, shared caches or balances.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KINDS=Object.freeze([
  "wallets","balances","transactions","cards","payment-sources",
  "recipients","activity","permissions","dashboard-feed","saved-beneficiaries"
]);
export const PAY54_ACCOUNT_CONTEXT_CACHE_DOMAINS=KINDS;
export function planPay54AccountScopedReload({
  rebindPreflight,
  oldAccountId,
  newAccountId
}={}){
  if(rebindPreflight?.schema!=="pay54.account-rebind-preflight.v1"||
     rebindPreflight.sessionRebound!==false||
     rebindPreflight.replayFenceValidated!==false||
     !UUID.test(oldAccountId??"")||!UUID.test(newAccountId??"")||
     oldAccountId.toLowerCase()===newAccountId.toLowerCase()||
     rebindPreflight.candidateAccountId!==newAccountId.toLowerCase()){
    throw new Error("PAY54_ACCOUNT_CACHE_RELOAD_BOUNDARY_DENIED");
  }
  return Object.freeze({
    schema:"pay54.account-scoped-refresh-plan.v1",
    previousAccountId:oldAccountId.toLowerCase(),
    proposedAccountId:newAccountId.toLowerCase(),
    domainsToClear:KINDS,
    requiresInFlightRequestCancellation:true,
    requiresFreshServerVerifiedSession:true,
    requiresTenantScopedReadQueries:true,
    requiresPermissionBasedActions:true,
    dataCacheCleared:false,
    crossTenantDataDisplayed:false,
    financialExecutionAuthorised:false,
    transitionExecuted:false,
    productionReady:false
  });
}
