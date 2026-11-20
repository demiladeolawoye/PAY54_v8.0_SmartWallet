"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {reconcilePay54Batch26ReleaseBlockers as review,
 reconcilePay54Batch26Checkout as real}
 from "../governance/pay54-batch26-release-blocker-merge.mjs";
const blockers=Array.from({length:8},(_,i)=>({
 id:"CR-EXAMPLE-"+i,priority:"P0",operationallyClosed:false
}));
const valid={
 prior:{schema:"pay54.batch25-cto-operational-blocker-register.v1",
  productionReleaseAuthorised:false,blockers},
 card:{developmentProviderScriptPresent:true,
  productionCardFundingApproved:false},
 root:{sourceRootPublicationBlocked:true,activePagesSourceVerified:false}
};
test("1050: real repo retains unsolved production P0 account, Pages, card blockers",()=>{
 const r=real();
 assert.equal(r.sourceRootUnsafeForPublication,true);
 assert.equal(r.developmentPaymentProviderMustNotFundCustomers,true);
 assert.equal(r.stagingActivationAuthorised,false);
 assert.equal(r.productionReleaseAuthorised,false);
});
test("1050: self-marked closed risks and forged production state fail closed",()=>{
 const r=review(valid);
 assert.equal(r.outstandingSourceIdentifiedRisks,8);
 assert.equal(r.latestCIIsNotOperationalAcceptance,true);
 for(const bad of [
  {prior:{...valid.prior,productionReleaseAuthorised:true}},
  {prior:{...valid.prior,blockers:blockers.map((x,i)=>
    i===0?{...x,operationallyClosed:true}:x)}},
  {card:{developmentProviderScriptPresent:false,
    productionCardFundingApproved:true}},
  {root:{sourceRootPublicationBlocked:false,activePagesSourceVerified:true}}
 ])assert.throws(()=>review({...valid,...bad}),
  /BATCH26_RELEASE_BLOCKER_DENIED/);
});
