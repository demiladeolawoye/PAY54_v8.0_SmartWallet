"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {evaluateCanonicalWriterAdmission} from "../src/wave2/canonical-writer-admission.mjs";
import {buildWalletReadModel} from "../src/wave2/wallet-read-model.mjs";
import {assessStagingAdmission} from "../src/wave2/staging-admission.mjs";
const id="a0000000-0000-4000-8000-000000000001";
const wallet=(postedMinor="10000",heldMinor="2500")=>({
 schema:"pay54.wallet-read.v1",authoritative:true,
 wallets:[{walletId:id,currency:"GBP",postedMinor,heldMinor}]
});
test("financial writer never self-authorises even if all evidence claims pass",()=>{
 const empty=evaluateCanonicalWriterAdmission({});
 assert.equal(empty.status,"NO_GO");
 assert.equal(empty.financialExecutionEnabled,false);
 assert.ok(empty.missing.length>10);
 const all=Object.fromEntries(empty.requirements.map(k=>[k,true]));
 const full=evaluateCanonicalWriterAdmission(all);
 assert.equal(full.status,"INDEPENDENT_ATTESTATION_REQUIRED");
 assert.equal(full.financialExecutionEnabled,false);
 assert.equal(full.productionAuthorised,false);
 assert.throws(()=>evaluateCanonicalWriterAdmission(null),TypeError);
});
test("wallet read contract produces exact available minor units and disables transfer",()=>{
 const model=buildWalletReadModel(wallet());
 assert.equal(model.wallets[0].availableMinor,"7500");
 assert.equal(model.wallets[0].canInitiateTransfer,false);
 assert.equal(model.financialExecutionEnabled,false);
 assert.ok(Object.isFrozen(model.wallets[0]));
});
test("wallet read refuses untrusted, duplicate, negative or inconsistent values",()=>{
 const bad=wallet();bad.authoritative=false;
 assert.throws(()=>buildWalletReadModel(bad),/INVALID_WALLET_READ/);
 assert.throws(()=>buildWalletReadModel(wallet("100","101")) ,/INCONSISTENT_HOLD/);
 assert.throws(()=>buildWalletReadModel(wallet("-1","0")) ,/INVALID_WALLET_ITEM/);
 const duplicated=wallet();duplicated.wallets.push({...duplicated.wallets[0]});
 assert.throws(()=>buildWalletReadModel(duplicated),/INVALID_WALLET_ITEM/);
 assert.throws(()=>buildWalletReadModel(wallet("9223372036854775808","0")) ,/AMOUNT_OUT_OF_RANGE/);
});
test("staging readiness cannot grant provisioning or spending",()=>{
 const empty=assessStagingAdmission({});
 assert.equal(empty.status,"NO_GO");
 const all=Object.fromEntries(empty.missing.map(k=>[k,true]));
 const complete=assessStagingAdmission(all);
 assert.equal(complete.status,"SEPARATE_SPENDING_AUTHORISATION_REQUIRED");
 assert.equal(complete.provisionAuthorised,false);
 assert.equal(complete.cloudSpendingAuthorised,false);
});
