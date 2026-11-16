"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createPostReadRevocation} from "../security/account-post-read-revocation.mjs";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountDbPrincipal} from "../security/account-db-principal.mjs";
const S="11111111-1111-4111-8111-111111111111";
async function descriptor(){
 const r=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>({
  subjectId:S,authenticated:true,revoked:false,expiresAt:Math.floor(Date.now()/1000)+60
 })});
 return createAccountDbPrincipal({principal:await r.resolve({}),
  roleName:"pay54_tenant_verified_0001",assertRoleMapping:()=>true});
}
test("post-query revocation false permits display only",async()=>{
 const dbPrincipal=await descriptor();
 const policy=createPostReadRevocation({checkAuthoritative:async()=>false});
 const result=await policy.verify({dbPrincipal,readResult:{accounts:[],financialExecutionEnabled:false}});
 assert.equal(result.verifiedForDisplay,true);
 assert.equal(result.financialExecutionEnabled,false);
});
test("revoked, unknown, unavailable and time-expired verification deny",async()=>{
 const dbPrincipal=await descriptor();
 const readResult={accounts:[],financialExecutionEnabled:false};
 for(const checkAuthoritative of [async()=>true,async()=>null,async()=>{throw Error("outage");}]){
  await assert.rejects(()=>createPostReadRevocation({checkAuthoritative}).verify({
   dbPrincipal,readResult
  }),/ACCOUNT_READ_REVOKED|ACCOUNT_REVOCATION_UNAVAILABLE/);
 }
 let n=0;
 const late=createPostReadRevocation({checkAuthoritative:async()=>false,
  now:()=>n++===0?1000:5000,maxLatencyMs:500});
 await assert.rejects(()=>late.verify({dbPrincipal,readResult}),/ACCOUNT_REVOCATION_UNAVAILABLE/);
});
