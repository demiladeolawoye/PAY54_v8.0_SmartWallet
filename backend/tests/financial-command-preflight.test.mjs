"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createPay54FinancialCommandPreflight} from "../src/financial-command-preflight.mjs";
const principal="b4700000-0000-4000-8000-000000000001";
const account="b4700000-0000-4000-8000-000000000002";
const session="b4700000-0000-4000-8000-000000000003";
const sourceWallet="b4700000-0000-4000-8000-000000000004";
const sourceAccount="b4700000-0000-4000-8000-000000000005";
const destination="b4700000-0000-4000-8000-000000000006";
const request={headers:{authorization:"Bearer "+"A".repeat(43)}};
const instruction=Object.freeze({
 kind:"WALLET_TRANSFER_RESERVATION",
 requestedAccountId:account,sourceAccountId:sourceAccount,
 destinationWalletId:destination,amountMinor:"1200",
 idempotencyKey:"pay54-test-b47-0001",requestDigest:"a".repeat(64)
});
const identity=()=>({sessionId:session,principalId:principal,activeAccountId:account,status:"ACTIVE",version:7});
const scope=()=>({principalId:principal,accountId:account,sourceWalletId:sourceWallet,
 sourceAccountId:sourceAccount,destinationWalletId:destination,
 currency:"GBP",active:true,verifiedPersonalOwner:true,rlsVerified:true});
const fence=()=>({schema:"pay54.fresh-session-commit-fence.v1",sessionVersion:7,
 freshCommittedRead:true,atomicRevocationBarrierProven:false,productionAuthorised:false});
const build=({sessionResolver=async()=>identity(),scopeResolver=async()=>scope(),sessionFence={verify:async()=>fence()}}={})=>
 createPay54FinancialCommandPreflight({
  resolveAuthenticatedSession:sessionResolver,
  resolveFinancialScope:scopeResolver,
  freshSessionFence:sessionFence
 });
test("valid read-only preflight evidence remains strictly non-executable",async()=>{
 const result=await build().inspect({request,instruction});
 assert.match(result.instructionFingerprint,/^[0-9a-f]{64}$/);
 for(const flag of ["atomicRevocationBarrierProven","trustedFinancialExecutorAttached",
  "paymentInstructionAuthorised","financialExecutionEnabled",
  "stagingDeploymentAuthorised","productionAuthorised"])assert.equal(result[flag],false);
 assert.equal(result.identityRechecked,true);
 assert.equal(result.scopeRechecked,true);
 assert.ok(Object.isFrozen(result));
});
test("different transfer amounts produce different evidence hashes",async()=>{
 const preflight=build();
 const a=await preflight.inspect({request,instruction});
 const b=await preflight.inspect({request,instruction:{...instruction,amountMinor:"1201"}});
 assert.notEqual(a.instructionFingerprint,b.instructionFingerprint);
});
test("rejects invalid instruction and claimed account",async()=>{
 const preflight=build();
 for(const patch of [
  {requestedAccountId:principal},{sourceAccountId:destination},
  {destinationWalletId:sourceWallet},{amountMinor:"0"},
  {amountMinor:"9223372036854775808"},{amountMinor:"1.5"},
  {idempotencyKey:"short"},{requestDigest:"b".repeat(63)},
  {kind:"BANK_PAYOUT"}
 ])await assert.rejects(preflight.inspect({request,instruction:{...instruction,...patch}}),
  /PAY54_FINANCIAL_COMMAND_NOT_AUTHORISED/);
});
test("revocation, switch and scope drift are denied",async()=>{
 let calls=0;
 const rotated=build({sessionResolver:async()=>({...identity(),version:++calls===1?7:8})});
 await assert.rejects(rotated.inspect({request,instruction}),/NOT_AUTHORISED/);
 calls=0;
 const drift=build({scopeResolver:async()=>({...scope(),currency:++calls===1?"GBP":"USD"})});
 await assert.rejects(drift.inspect({request,instruction}),/NOT_AUTHORISED/);
 const revoked=build({sessionResolver:async()=>({...identity(),status:"REVOKED"})});
 await assert.rejects(revoked.inspect({request,instruction}),/NOT_AUTHORISED/);
 const stale=build({sessionFence:{verify:async()=>({...fence(),freshCommittedRead:false})}});
 await assert.rejects(stale.inspect({request,instruction}),/NOT_AUTHORISED/);
});
test("fails closed without trusted dependencies or bearer",async()=>{
 assert.throws(()=>createPay54FinancialCommandPreflight(),/NOT_AUTHORISED/);
 await assert.rejects(build().inspect({request:{headers:{}},instruction}),/NOT_AUTHORISED/);
});
