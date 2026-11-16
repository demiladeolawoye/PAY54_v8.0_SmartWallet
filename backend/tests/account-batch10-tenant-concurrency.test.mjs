"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {createAccountCredentialBinding} from "../security/account-credential-binding.mjs";
import {createAccountCredentialRequestFence} from "../security/account-credential-request-fence.mjs";
import {createAccountCredentialCheckoutBudget} from "../db/account-credential-checkout-budget.mjs";
import {createAccountRolePinnedPool} from "../db/account-role-pinned-pool.mjs";

const SUBJECT="11111111-1111-4111-8111-111111111111";
const TENANT="22222222-2222-4222-8222-222222222222";
const ACCOUNT="33333333-3333-4333-8333-333333333333";
const ROLE="pay54_tenant_verified_0001";
async function binding(){
 const resolver=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>({
  subjectId:SUBJECT,authenticated:true,revoked:false,expiresAt:Math.floor(Date.now()/1000)+60
 })});
 const dbPrincipal=createAccountDbPrincipal({
  principal:await resolver.resolve({}),roleName:ROLE,assertRoleMapping:()=>true
 });
 return createAccountCredentialBinding({
  loadAuthoritativeBinding:async()=>({
   subjectId:SUBJECT,tenantId:TENANT,accountId:ACCOUNT,roleName:ROLE,
   active:true,revoked:false,rotationEpoch:5
  })
 }).verify({dbPrincipal,tenantId:TENANT,accountId:ACCOUNT,custodyEvidence:{
  schemaVersion:1,tenantId:TENANT,accountId:ACCOUNT,roleName:ROLE,
  environment:"test",endpointId:"isolated-test-postgres",
  reviewId:"independent-approval-001",rotationEpoch:5,
  workloadIdentityBound:true,tenantScopedSecretAccess:true,
  noCrossTenantSecretAccess:true,noProvisioningPrivileges:true,
  tlsPeerVerified:true,tlsHostnameVerified:true,endpointAllowlisted:true,
  noRoleSwitching:true,noPhysicalSessionSharing:true,
  financialPrivilegeAbsent:true,customerSelectGrantsAbsent:true,
  independentlyReviewed:true
 }});
}
test("250: one-use fence + bounded checkout + role pinning never reuse released session",async()=>{
 const b=await binding(),releases=[];
 const fence=createAccountCredentialRequestFence();
 const budget=createAccountCredentialCheckoutBudget({
  maxConcurrentPerRole:1,maxConcurrentTotal:1
 });
 let physical=0;
 const pool=createAccountRolePinnedPool({
  connectForBinding:async()=>({
   query:async()=>({rows:[]}),
   release:d=>{physical++;releases.push(d);}
  }),
  reviewConnection:async(_,x)=>({
   currentUser:x.roleName,sessionUser:x.roleName,rotationEpoch:x.rotationEpoch,
   endpointId:x.endpointId,financialPrivilegeAbsent:true,nonSwitchable:true
  })
 });
 for(let i=0;i<20;i++){
  const token=fence.issue({binding:b,requestedAccountId:ACCOUNT,requestedTenantId:TENANT});
  const intent=fence.consume({token,binding:b});
  assert.equal(intent.financialExecutionEnabled,false);
  const result=await budget.execute({
   binding:b,callback:async issued=>pool.withClient({
    binding:issued,callback:async client=>{
     assert.deepEqual((await client.query("SELECT 1")).rows,[]);
     return intent;
    }
   })
  });
  assert.equal(result.customerDataAccessEnabled,false);
  assert.equal(budget.snapshot().activeTotal,0);
  await assert.rejects(async()=>fence.consume({token,binding:b}),
   /ACCOUNT_REQUEST_FENCE_EXPIRED/);
 }
 assert.equal(physical,20);
 assert.equal(releases.every(Boolean),true);
});
test("250: concurrent operations exceeding role budget do not allocate another client",async()=>{
 const b=await binding();
 const fence=createAccountCredentialRequestFence();
 const budget=createAccountCredentialCheckoutBudget({
  maxConcurrentPerRole:1,maxConcurrentTotal:1
 });
 let entered,release,allocations=0;
 const start=new Promise(resolve=>entered=resolve);
 const wait=new Promise(resolve=>release=resolve);
 const token=fence.issue({binding:b,requestedAccountId:ACCOUNT,requestedTenantId:TENANT});
 fence.consume({token,binding:b});
 const first=budget.execute({binding:b,callback:async()=>{allocations++;entered();await wait;}});
 await start;
 await assert.rejects(()=>budget.execute({
  binding:b,callback:async()=>{allocations++;return 1;}
 }),/ACCOUNT_CHECKOUT_OVER_CAPACITY/);
 assert.equal(allocations,1);
 release();
 await first;
 assert.equal(budget.snapshot().activeTotal,0);
});
