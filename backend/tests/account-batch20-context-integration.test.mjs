"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {proposePay54AccountSelection}
 from "../domain/account-context-selection.mjs";
import {planPay54TrustedAccountRebind}
 from "../domain/account-context-rebind.mjs";
import {planPay54AccountScopedReload}
 from "../domain/account-context-cache-plan.mjs";

const actor="11111111-1111-4111-8111-111111111111";
const personal="22222222-2222-4222-8222-222222222222";
const business="33333333-3333-4333-8333-333333333333";
const sid="44444444-4444-4444-8444-444444444444";
test("763: Personal to Business review flow is strictly non-executing end to end",()=>{
  const selection=proposePay54AccountSelection({
    authenticatedPrincipalId:actor,requestedAccountId:business,
    accountFromTrustedStore:{accountId:business,legalOwnerId:actor,type:"BUSINESS",
      displayName:"PAY54 Business",status:"ACTIVE",verificationStatus:"VERIFIED"},
    membershipFromTrustedStore:{accountId:business,principalId:actor,
      role:"BUSINESS_OWNER",status:"ACTIVE"}
  });
  const rebind=planPay54TrustedAccountRebind({
    selectionProposal:selection,
    currentSessionFromTrustedStore:{sessionId:sid,principalId:actor,
      activeAccountId:personal,status:"ACTIVE",version:3,expiresAtMs:300000},
    serverTimeMs:200000,authoritativeSessionVersion:3
  });
  const refresh=planPay54AccountScopedReload({
    rebindPreflight:rebind,oldAccountId:personal,newAccountId:business
  });
  assert.equal(selection.financialOperationAuthorised,false);
  assert.equal(rebind.sessionRebound,false);
  assert.equal(rebind.requiresOldSessionRevocation,true);
  assert.equal(refresh.dataCacheCleared,false);
  assert.equal(refresh.crossTenantDataDisplayed,false);
  assert.equal(refresh.transitionExecuted,false);
  assert.equal(refresh.productionReady,false);
  assert.ok(refresh.domainsToClear.includes("transactions"));
  assert.ok(refresh.domainsToClear.includes("cards"));
  assert.ok(refresh.domainsToClear.includes("wallets"));
});
test("763: existing frontend account contract and new backend refusal cannot silently become active",()=>{
  const frontend=readFileSync(new URL("../../assets/js/ui/account-context-selector.js",import.meta.url),"utf8");
  const contract=readFileSync(new URL("../../assets/js/dashboard/account-switcher-contract.mjs",import.meta.url),"utf8");
  const server=readFileSync(new URL("../src/server.mjs",import.meta.url),"utf8");
  assert.match(frontend,/serverSwitchVerified: false/);
  assert.match(frontend,/businessContextAvailable: false/);
  assert.match(frontend,/accountSwitchExecuted: false/);
  assert.match(contract,/switchingEnabled: false/);
  assert.match(server,/ACCOUNT_CONTEXT_SERVICE_UNAVAILABLE/);
  assert.doesNotMatch(frontend,/\.switchAccount\s*\(/);
  assert.doesNotMatch(frontend,/\.setActiveAccount\s*\(/);
});
