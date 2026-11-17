"use strict";
/**
 * PAY54 Batch 26 / 1049 — final source security blockers.
 * Source integrity may be good even when every operational gate remains open.
 * This function cannot close a P0 or authorise staging/production.
 */
import {assessPay54OperationalBlockersInCheckout}
 from "./pay54-batch25-operational-blockers.mjs";
import {inspectPay54CheckoutDashboardSource}
 from "./pay54-batch25-card-provider-publication.mjs";
import {assessPay54TrackedRepositoryRoot}
 from "./pay54-batch25-publication-risk.mjs";
const deny=()=>{throw Error("PAY54_BATCH26_RELEASE_BLOCKER_DENIED");};
export function reconcilePay54Batch26ReleaseBlockers({
 prior,card,root
}={}){
 if(prior?.schema!=="pay54.batch25-cto-operational-blocker-register.v1" ||
    prior.productionReleaseAuthorised!==false ||
    !Array.isArray(prior.blockers)||prior.blockers.length<8 ||
    prior.blockers.some(x=>x.operationallyClosed!==false) ||
    card?.developmentProviderScriptPresent!==true ||
    card?.productionCardFundingApproved!==false ||
    root?.sourceRootPublicationBlocked!==true ||
    root?.activePagesSourceVerified!==false)deny();
 const actions=Object.freeze(prior.blockers.map(x=>Object.freeze({
  id:x.id,priority:x.priority,
  operationalEvidenceRequired:true,
  closedBySourceTests:false
 })));
 return Object.freeze({
  schema:"pay54.batch26-release-blocker-merge.v1",
  outstandingSourceIdentifiedRisks:actions.length,
  actions,
  sourceRootUnsafeForPublication:true,
  developmentPaymentProviderMustNotFundCustomers:true,
  latestCIIsNotOperationalAcceptance:true,
  stagingActivationAuthorised:false,
  productionReleaseAuthorised:false
 });
}
export function reconcilePay54Batch26Checkout(){
 return reconcilePay54Batch26ReleaseBlockers({
  prior:assessPay54OperationalBlockersInCheckout(),
  card:inspectPay54CheckoutDashboardSource(),
  root:assessPay54TrackedRepositoryRoot()
 });
}
