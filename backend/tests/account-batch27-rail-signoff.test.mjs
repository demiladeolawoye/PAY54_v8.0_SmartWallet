"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54UkNigeriaPartnerSignoffs as inspect}
 from "../governance/pay54-batch27-rail-signoff.mjs";
const roles=["uk-inbound","global-fx-backbone","ng-primary-payout",
 "ng-secondary-payout"];
const areas=["legal","aml","safeguarding","finance-reconciliation",
 "security","provider-owner"];
const rails=roles.map((role,i)=>({role,providerId:"example.provider."+i,
 approvals:Object.fromEntries(areas.map(x=>[x,true]))}));
test("1094: 24 claimed rail approvals still are not contract evidence",()=>{
 const r=inspect({rails});
 assert.equal(r.requiredSignoffs,24);
 assert.equal(r.actualFinancialRailsActivated,false);
 assert.equal(r.productionSettlementAuthorised,false);
});
test("1094: same PSP for both Nigeria payout routes and absent safeguarding rejected/flagged",()=>{
 assert.throws(()=>inspect({rails:rails.map((x,i)=>i===3?{
  ...x,providerId:rails[2].providerId}:x)}),/UK_NG_RAIL_SIGNOFF_DENIED/);
 const changed=rails.map((x,i)=>i===3?{
  ...x,approvals:{...x.approvals,safeguarding:false}}:x);
 const r=inspect({rails:changed});
 assert.ok(r.claimedMissingSignoffs.includes("ng-secondary-payout:safeguarding"));
});
