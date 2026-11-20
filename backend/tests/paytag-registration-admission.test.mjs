"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
 createPay54PayTagRegistrationAdmission, PAY54_PAYTAG_ADMISSION_POSTURE
} from "../domain/paytag-registration-admission.mjs";

const NOW = 1800000000000;
const principalId="11111111-1111-4111-8111-111111111111";
const sessionId="33333333-3333-4333-8333-333333333333";
const accountId="22222222-2222-4222-8222-222222222222";
const session = Object.freeze({
 sessionId,principalId,activeAccountId:accountId,status:"ACTIVE",version:2,
 issuedAtMs:NOW-500000,expiresAtMs:NOW+500000
});
const make=(verified=session)=>createPay54PayTagRegistrationAdmission({
 resolveAuthenticatedSession:async()=>verified,
 getTrustedServerTimeMs:()=>NOW
});
const req=(value="@Alias_54")=>({
 requestContext:{headers:{authorization:"Bearer server-validated-only"}},
 requestPayload:{proposedTag:value}
});
const denied=async fn=>assert.rejects(fn,/PAY54_PAYTAG_ADMISSION_DENIED/);

test("trusted session yields immutable admission snapshot, not a write permission",async()=>{
 const result=await make()(req());
 assert.equal(result.canonicalAlias,"alias_54");
 assert.equal(result.accountId,accountId);
 assert.equal(result.principalId,principalId);
 assert.equal(result.sessionVersion,2);
 assert.equal(result.registryWriteAuthorised,false);
 assert.equal(result.recipientResolutionAuthorised,false);
 assert.equal(result.financialExecutionEnabled,false);
 assert.equal(result.productionRelease,"BLOCKED");
 assert.equal(PAY54_PAYTAG_ADMISSION_POSTURE.httpRouteEnabled,false);
 assert.ok(Object.isFrozen(result));
});
test("client cannot supply account, wallet, principal, privileges or extra payload fields",async()=>{
 for(const field of ["accountId","walletId","principalId","sessionId","approval","financialExecutionEnabled","registryWriteAuthorised"]){
  const x=req();x.requestPayload[field]=field==="approval"?true:accountId;
  await denied(()=>make()(x));
 }
 await denied(()=>make()({requestContext:{},requestPayload:Object.create(null)}));
 await denied(()=>make()({requestContext:{},requestPayload:{}}));
});
test("invalid Unicode and reserved PayTags are denied without disclosing availability",async()=>{
 for(const input of ["@admіn","@pay54_support","@admin","@", "@a","@alpha..beta","@bad tag","@A\u0301lice"]){
  await denied(()=>make()(req(input)));
 }
});
test("expired, revoked, unbound, future, stale and invalid sessions are denied",async()=>{
 const variants=[
  {...session,status:"REVOKED"}, {...session,activeAccountId:null},
  {...session,principalId:"client-principal"}, {...session,version:0},
  {...session,expiresAtMs:NOW+500}, {...session,issuedAtMs:NOW+120000},
  {...session,issuedAtMs:NOW-SESSION_LIMIT()},
  {...session,expiresAtMs:NOW+24*60*60*1000}
 ];
 for(const s of variants)await denied(()=>make(s)(req()));
});
function SESSION_LIMIT(){return 48*60*60*1000;}
test("failed/unavailable authentication is always fail closed",async()=>{
 const admit=createPay54PayTagRegistrationAdmission({
   resolveAuthenticatedSession:async()=>{throw Error("credential invalid");},
   getTrustedServerTimeMs:()=>NOW
 });
 await denied(()=>admit(req()));
 assert.throws(()=>createPay54PayTagRegistrationAdmission({}),/PAY54_PAYTAG_ADMISSION_DENIED/);
});
