"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54TransferRoute}
 from "../domain/pay54-p2p-route-preview.mjs";
const sender={
 walletId:"wallet-original-001",country:"GB",currency:"GBP",
 legalEntity:"pay54-uk-entity001",ledgerDomain:"pay54-uk-ledger001"
};
const recipient={...sender,walletId:"wallet-recipient-002"};
function route(overrides={}){return assessPay54TransferRoute({
 sender,recipient:{...recipient,...overrides}
});}
test("327: same-currency same-ledger PAY54 is only a candidate",()=>{
 const r=route();
 assert.equal(r.routeType,"SAME_LEDGER_P2P_CANDIDATE");
 assert.equal(r.internalLedgerCandidate,true);
 assert.equal(r.crossBorder,false);
 assert.equal(r.fxRequired,false);
 assert.equal(r.executable,false);
 assert.equal(r.senderMembershipVerified,false);
 assert.equal(r.regulatedRoutingApproved,false);
});
test("327: PAY54 London to PAY54 Lagos still needs regulated settlement",()=>{
 const r=route({
  country:"NG",currency:"NGN",
  legalEntity:"pay54-ng-entity001",ledgerDomain:"pay54-ng-ledger001"
 });
 assert.equal(r.routeType,"CROSS_BORDER_REGULATED_ROUTING_REQUIRED");
 assert.equal(r.internalLedgerCandidate,false);
 assert.equal(r.crossBorder,true);
 assert.equal(r.fxRequired,true);
 assert.equal(r.executable,false);
});
test("327: same currency across country never becomes internal by wallet membership",()=>{
 const r=route({country:"NG",currency:"GBP"});
 assert.equal(r.crossBorder,true);
 assert.equal(r.internalLedgerCandidate,false);
 assert.equal(r.fxRequired,false);
 assert.equal(r.executable,false);
});
test("327: same jurisdiction differing currency or entity cannot bypass settlement",()=>{
 assert.equal(route({currency:"EUR"}).routeType,"FX_SETTLEMENT_REQUIRED");
 assert.equal(route({legalEntity:"another-entity001"}).routeType,
  "INTER_ENTITY_SETTLEMENT_REQUIRED");
 assert.equal(route({ledgerDomain:"another-ledger001"}).internalLedgerCandidate,false);
});
test("327: no self transfer or malformed business wallet routing",()=>{
 assert.equal(route({walletId:sender.walletId}).routeType,"SELF_TRANSFER_INVALID");
 assert.throws(()=>route({country:"UK"}),/PAY54_P2P_WALLET_CONTEXT_INVALID/);
 assert.throws(()=>assessPay54TransferRoute({sender,recipient:{...recipient,
  legalEntity:null}}),/PAY54_P2P_WALLET_CONTEXT_INVALID/);
});
