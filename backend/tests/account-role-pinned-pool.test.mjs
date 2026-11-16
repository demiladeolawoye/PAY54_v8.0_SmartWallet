"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {createAccountCredentialBinding} from "../security/account-credential-binding.mjs";
import {createAccountRolePinnedPool} from "../db/account-role-pinned-pool.mjs";

const subjectId="11111111-1111-4111-8111-111111111111";
const tenantId="22222222-2222-4222-8222-222222222222";
const accountId="33333333-3333-4333-8333-333333333333";
const roleName="pay54_tenant_verified_0001";
const evidence=Object.freeze({
 schemaVersion:1,tenantId,accountId,roleName,environment:"test",
 endpointId:"isolated-test-postgres",reviewId:"independent-approval-001",
 rotationEpoch:2,workloadIdentityBound:true,tenantScopedSecretAccess:true,
 noCrossTenantSecretAccess:true,noProvisioningPrivileges:true,
 tlsPeerVerified:true,tlsHostnameVerified:true,endpointAllowlisted:true,
 noRoleSwitching:true,noPhysicalSessionSharing:true,
 financialPrivilegeAbsent:true,customerSelectGrantsAbsent:true,
 independentlyReviewed:true
});
async function makeBinding(){
 const resolver=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>({
  subjectId,authenticated:true,revoked:false,expiresAt:Math.floor(Date.now()/1000)+60
 })});
 const principal=await resolver.resolve({});
 const dbPrincipal=createAccountDbPrincipal({principal,roleName,
  assertRoleMapping:()=>true});
 return createAccountCredentialBinding({
  loadAuthoritativeBinding:async()=>({
   subjectId,tenantId,accountId,roleName,active:true,revoked:false,rotationEpoch:2
  })
 }).verify({dbPrincipal,custodyEvidence:evidence,accountId,tenantId});
}
function observed(binding){
 return {sessionUser:binding.roleName,currentUser:binding.roleName,
  rotationEpoch:binding.rotationEpoch,endpointId:binding.endpointId,
  financialPrivilegeAbsent:true,nonSwitchable:true};
}
test("220: verified test connection discards even on successful checkout",async()=>{
 const binding=await makeBinding();
 const releases=[];
 const client={query:async()=>({rows:[]}),release:discard=>releases.push(discard)};
 const pool=createAccountRolePinnedPool({
  connectForBinding:async()=>client,reviewConnection:async(_,b)=>observed(b)
 });
 assert.equal(await pool.withClient({binding,callback:async()=>42}),42);
 assert.deepEqual(releases,[true]);
});
test("220: overlapping checkout cannot reuse the same client",async()=>{
 const binding=await makeBinding();
 const releases=[];
 const client={query:async()=>({rows:[]}),release:discard=>releases.push(discard)};
 const pool=createAccountRolePinnedPool({
  connectForBinding:async()=>client,reviewConnection:async(_,b)=>observed(b)
 });
 let unlock;
 const held=new Promise(resolve=>{unlock=resolve;});
 let entered;
 const started=new Promise(resolve=>{entered=resolve;});
 const first=pool.withClient({binding,callback:async()=>{entered();await held;return 7;}});
 await started;
 await assert.rejects(()=>pool.withClient({binding,callback:async()=>3}),
  /ACCOUNT_PINNED_POOL_CLIENT_SHARED/);
 unlock();
 assert.equal(await first,7);
 assert.deepEqual(releases,[true]);
});
test("220: role mismatch, rotation and revoked reviewer assertions all deny and discard",async()=>{
 const binding=await makeBinding();
 for (const patch of [
  {sessionUser:"postgres"},{currentUser:"pay54_tenant_other_0001"},
  {rotationEpoch:1},{endpointId:"other-endpoint"},
  {financialPrivilegeAbsent:false},{nonSwitchable:false},{nonSwitchable:undefined}
 ]){
  const releases=[];
  const pool=createAccountRolePinnedPool({
   connectForBinding:async()=>({
    query:async()=>({rows:[]}),release:d=>releases.push(d)
   }),reviewConnection:async(_,b)=>({...observed(b),...patch})
  });
  await assert.rejects(()=>pool.withClient({binding,callback:async()=>1}),
   /ACCOUNT_PINNED_POOL_ACTOR_MISMATCH/);
  assert.deepEqual(releases,[true]);
 }
});
test("220: post-callback role changes, exceptions, invalid bindings and invalid clients",async()=>{
 const binding=await makeBinding();
 let calls=0;
 const releases=[];
 const client={query:async()=>({rows:[]}),release:d=>releases.push(d)};
 const pool=createAccountRolePinnedPool({
  connectForBinding:async()=>client,
  reviewConnection:async(_,b)=>{
   calls+=1;
   return calls===1?observed(b):{...observed(b),currentUser:"postgres"};
  }
 });
 await assert.rejects(()=>pool.withClient({binding,callback:async()=>9}),
  /ACCOUNT_PINNED_POOL_ACTOR_CHANGED/);
 assert.deepEqual(releases,[true]);
 await assert.rejects(()=>pool.withClient({
  binding:{...binding},callback:async()=>0
 }),/ACCOUNT_CREDENTIAL_BINDING_DENIED/);
 const invalid=createAccountRolePinnedPool({
  connectForBinding:async()=>null,reviewConnection:async()=>observed(binding)
 });
 await assert.rejects(()=>invalid.withClient({binding,callback:async()=>0}),
  /ACCOUNT_PINNED_POOL_CLIENT_INVALID/);
 const releases2=[];
 const fail=createAccountRolePinnedPool({
  connectForBinding:async()=>({
   query:async()=>({rows:[]}),release:d=>releases2.push(d)
  }),reviewConnection:async(_,b)=>observed(b)
 });
 await assert.rejects(()=>fail.withClient({binding,callback:async()=>{throw new Error("OUTAGE");}}),
  /OUTAGE/);
 assert.deepEqual(releases2,[true]);
});
