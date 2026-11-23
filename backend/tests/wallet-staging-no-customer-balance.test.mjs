"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createPay54WalletBalancePresenter}
 from "../../assets/js/dashboard/wallet-balance-presenter.mjs";

const ACCOUNT="22222222-2222-4222-8222-222222222222";
const WALLET="44444444-4444-4444-8444-444444444444";

test("a reconciled posted-minus-held accounting result is never a customer display balance",async()=>{
 const rendered=[],cleared=[];
 const presenter=createPay54WalletBalancePresenter({
  authenticatedRead:async()=>Object.freeze({
   schema:"pay54.authenticated-accounting-evidence.v1",
   accountId:ACCOUNT,walletId:WALLET,
   sessionVersion:2,currency:"GBP",
   postedMinor:"10000",heldMinor:"2000",
   computedUnreservedMinor:"8000",
   sessionRechecked:true,
   customerAvailableBalanceVerified:false,
   authorisedForCustomerDisplay:false,
   stagingDeploymentAuthorised:false,
   productionReady:false,
   financialExecutionEnabled:false
  }),
  renderBalance:x=>rendered.push(x),
  clearBalance:()=>cleared.push(true)
 });
 presenter.confirmFromTrustedAccountSelection({
  accountId:ACCOUNT,principalVersion:2
 });
 await assert.rejects(presenter.refresh({
  accountId:ACCOUNT,principalVersion:2
 }),/PAY54_WALLET_PRESENTATION_DENIED/);
 assert.equal(rendered.length,0);
 assert.ok(cleared.length>=2);
 presenter.onLogout();
});
