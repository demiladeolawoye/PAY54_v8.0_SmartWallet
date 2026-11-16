"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {createAccountConnectionProvenance} from "../db/account-connection-provenance.mjs";
import {createAccountCurrentMembership} from "../domain/account-current-membership.mjs";
import {createAccountReadLease} from "../security/account-read-lease.mjs";
import {createPostReadRevocation} from "../security/account-post-read-revocation.mjs";
import {createAccountReadAuditGate} from "../security/account-read-audit-gate.mjs";
import {createAccountAuditEnvelope} from "../security/account-audit-envelope.mjs";
const S="11111111-1111-4111-8111-111111111111";
const Q="22222222-2222-4222-8222-222222222222";
const A="33333333-3333-4333-8333-333333333333";
const ROLE="pay54_tenant_verified_0001";
const account={accountId:A,type:"BUSINESS",legalOwnerId:S,displayName:"Test Ltd",
  status:"ACTIVE",verificationStatus:"VERIFIED"};
const membership={accountId:A,principalId:S,role:"BUSINESS_VIEWER",status:"ACTIVE"};
const actorRow={current_user_name:ROLE,session_user_name:ROLE,can_login:true,
 superuser:false,bypass_rls:false,inherit:false,create_role:false,create_db:false,
 replication:false,memberships_count:0,row_security_enabled:true,
 customer_table_ownership_count:0};
const resolver=createTrustedAccountPrincipalResolver({verifyServerSession:async request=>
 request.authenticated?{subjectId:request.subject,authenticated:true,revoked:false,
  expiresAt:Math.floor(Date.now()/1000)+90}:null});
async function makeActor(subject=S){
 const principal=await resolver.resolve({authenticated:true,subject});
 return createAccountDbPrincipal({principal,roleName:ROLE,
   assertRoleMapping:(id,role)=>id===S&&role===ROLE});
}
test("source-only verified principal, DB metadata, membership, lease, revocation, audit compose safely",async()=>{
 const actor=await makeActor(),steps=[];
 const guard=createAccountConnectionProvenance({reviewedRoleCapabilities:async()=>true});
 const identity=await guard.verify({dbPrincipal:actor,client:{query:async()=>({rows:[actorRow]})}});
 assert.equal(identity.liveCredentialAttested,false);
 const membershipGate=createAccountCurrentMembership({loadCurrent:async()=>{
  steps.push("membership");return {account,membership};
 }});
 const lease=createAccountReadLease();
 const token=lease.issue(actor);
 const audited=createAccountReadAuditGate({
  read:async()=>{
   const used=lease.consume(token);
   await membershipGate.assertCurrent({dbPrincipal:used.dbPrincipal,accountId:A});
   steps.push("read");
   const result={accounts:[],financialExecutionEnabled:false};
   await createPostReadRevocation({checkAuthoritative:async()=>{
    steps.push("revocation");return false;
   }}).verify({dbPrincipal:actor,readResult:result});
   return result;
  },
  audit:createAccountAuditEnvelope({sink:async()=>{
   steps.push("audit");
  }})
 });
 const result=await audited.execute({});
 assert.equal(result.financialExecutionEnabled,false);
 assert.deepEqual(steps,["membership","read","revocation","audit"]);
 await assert.rejects(()=>audited.execute({}),/ACCOUNT_READ_DENIED/);
});
test("cross-tenant current membership refuses access before any account read",async()=>{
 const actor=await makeActor();
 const gate=createAccountCurrentMembership({loadCurrent:async()=>({
  account,membership:{...membership,principalId:Q}
 })});
 await assert.rejects(()=>gate.assertCurrent({dbPrincipal:actor,accountId:A}),
  /ACCOUNT_NOT_AVAILABLE/);
});
test("revocation changing to true after data fetch fails before disclosure",async()=>{
 const actor=await makeActor(),events=[];
 const denied=createAccountReadAuditGate({
  read:async()=>{
   await createPostReadRevocation({checkAuthoritative:async()=>true})
    .verify({dbPrincipal:actor,
      readResult:{accounts:[{accountId:A}],financialExecutionEnabled:false}});
   return {accounts:[{accountId:A}],financialExecutionEnabled:false};
  },
  audit:createAccountAuditEnvelope({sink:async e=>events.push(e)})
 });
 await assert.rejects(()=>denied.execute({}),/ACCOUNT_READ_DENIED/);
 assert.equal(events[0].outcome,"DENIED");
});
test("unverified cross-account principal cannot mint trusted database actor",async()=>{
 const outsider=await resolver.resolve({authenticated:true,subject:Q});
 assert.throws(()=>createAccountDbPrincipal({principal:outsider,roleName:ROLE,
   assertRoleMapping:(id)=>id===S}),/DB_PRINCIPAL_DENIED/);
});
