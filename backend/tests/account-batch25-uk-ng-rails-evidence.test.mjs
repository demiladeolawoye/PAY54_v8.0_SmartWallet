"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54UkNigeriaRailReadiness as inspect}
 from "../governance/pay54-batch25-uk-ng-rails-evidence.mjs";

const roles=["uk-inbound","crossborder-backbone",
 "ng-payout-primary","ng-payout-secondary"];
const categories=[
 "executed-contract","regulated-permission","aml-sanctions-kyt",
 "safeguarding-funds-flow","fx-quote-expiry","settlement-reconciliation",
 "webhook-authentication","refund-disputes","outage-failover",
 "data-residency-and-dpa"
];
const providers=roles.map((role,i)=>({
 role,providerId:"synthetic.partner."+String(i+1),
 evidenceDigests:Object.fromEntries(categories.map(c=>[c,"a".repeat(64)]))
}));
test("1002: 4 independent roles and 40 fingerprints allow human review only",()=>{
 const r=inspect({providers});
 assert.equal(r.distinctPartnerRoleCount,4);
 assert.equal(r.requiredEvidenceCount,40);
 assert.equal(r.structurallyCompleteForIndependentReview,true);
 assert.equal(r.actualProviderContractsVerified,false);
 assert.equal(r.liveFinancialExecutionAuthorised,false);
 assert.ok(Object.isFrozen(r.missingEvidence));
});
test("1002: missing payout route or duplicate PSP causes denial",()=>{
 assert.throws(()=>inspect({providers:providers.slice(0,3)}),
  /CORRIDOR_PARTNER_EVIDENCE_DENIED/);
 assert.throws(()=>inspect({providers:[
  {...providers[0]},
  {...providers[1],providerId:providers[0].providerId},
  providers[2],providers[3]
 ]}),/CORRIDOR_PARTNER_EVIDENCE_DENIED/);
 assert.throws(()=>inspect({providers:[
  {...providers[0],providerId:"pay54.development"},
  ...providers.slice(1)
 ]}),/CORRIDOR_PARTNER_EVIDENCE_DENIED/);
});
test("1002: missing contract and regulated approvals remain open",()=>{
 const missing=providers.map(x=>({...x}));
 missing[2]={...missing[2],evidenceDigests:{"executed-contract":"bad"}};
 const r=inspect({providers:missing});
 assert.equal(r.structurallyCompleteForIndependentReview,false);
 assert.ok(r.missingEvidence.length>=9);
 assert.equal(r.payoutFailoverOperationallyVerified,false);
});
