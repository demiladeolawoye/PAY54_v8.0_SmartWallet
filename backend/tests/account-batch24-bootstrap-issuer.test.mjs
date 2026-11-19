"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createPay54PostgresBootstrapIssuer as create }
 from "../src/postgres-bootstrap-issuer.mjs";

const assertion="A".repeat(70)+"."+"B".repeat(90)+"."+"C".repeat(86);
const payload={accessAssertion:assertion};
const origin="https://wallet.pay54.example";
const principalId="11111111-1111-4111-8111-111111111111";
const jti="99999999-9999-4999-8999-999999999999";
const now=1800000000000;
const verified={
 schema:"pay54.verified-identity-access.v1",
 cryptographicSignatureVerified:true,
 accountSessionCreated:false,
 oneTimeAssertionConsumptionRequired:true,
 principalId,assertionId:jti,
 issuer:"https://identity.pay54.example",
 expiresAtSeconds:Math.floor(now/1000)+120
};

function fixture({badRole=false,failAt,unknownCommit=false}={}){
 const calls=[],releases=[];
 const pool={
  async connect(){
   return {
    async query(sql,params){
     calls.push({sql,params});
     if(sql===failAt)throw Error("private-hostname-and-secret");
     if(sql.startsWith("SELECT current_user AS role_name"))return {rows:[{
       role_name:badRole?"postgres":"pay54_session_issue_role",
       restricted:!badRole,may_issue:true,
       may_write_sessions:false,may_write_receipts:false,
       may_write_ledger:false
     }]};
     if(sql.includes("FROM pay54.consume_identity_assertion_and_issue_bootstrap"))
      return {rows:[{sessionId:params[4],expiresAtMs:String(now+90000)}]};
     return {rows:[]};
    },
    release(discard){releases.push(Boolean(discard));}
   };
  }
 };
 return {pool,calls,releases};
}
const make=(fx,overrides={})=>create({
 writePool:fx.pool,
 identityVerifier:{verifyAccessToken:()=>({...verified})},
 trustedApplicationOrigin:origin,
 getTrustedServerTimeMs:()=>now,
 ...overrides
});

test("928: trusted identity consumes assertion once and reveals new secrets after commit",async()=>{
 const f=fixture();
 const result=await make(f)({requestPayload:payload,requestOrigin:origin});
 assert.equal(result.activeAccountId,null);
 assert.equal(result.moneyOperationAuthorised,false);
 assert.equal(result.productionHttpEndpointActive,false);
 assert.equal(result.version,1);
 assert.equal(result.expiresAtMs,now+90000);
 const sql=f.calls.find(x=>x.sql.includes("FROM pay54.consume_identity_assertion_and_issue_bootstrap"));
 assert.ok(sql);
 assert.equal(sql.params[1],principalId);
 assert.equal(sql.params[2],jti);
 assert.equal(sql.params[0],"https://identity.pay54.example");
 assert.deepEqual(sql.params[5],createHash("sha256")
  .update(Buffer.from(result.bearerToken,"base64url")).digest());
 assert.deepEqual(sql.params[6],createHash("sha256")
  .update(Buffer.from(result.csrfToken,"base64url")).digest());
 assert.equal(f.calls.at(-1).sql,"COMMIT");
 assert.deepEqual(f.releases,[false]);
 assert.equal(JSON.stringify(f.calls).includes(result.bearerToken),false);
 assert.ok(Object.isFrozen(result));
});

test("928: authentication failure and forged origin never reach SQL",async()=>{
 const bad=[
  {requestOrigin:"https://attacker.example"},
  {requestPayload:{...payload,principalId}},
  {requestPayload:{accessAssertion:"invalid"}}
 ];
 for(const override of bad){
  const f=fixture();
  await assert.rejects(make(f)({
   requestPayload:payload,requestOrigin:origin,...override
  }),/BOOTSTRAP_SERVICE_UNAVAILABLE/);
  assert.equal(f.calls.length,0);
 }
 const f=fixture();
 await assert.rejects(make(f,{identityVerifier:{
  verifyAccessToken:()=>({...verified,cryptographicSignatureVerified:false})
 }})({requestPayload:payload,requestOrigin:origin}),
 /BOOTSTRAP_SERVICE_UNAVAILABLE/);
 assert.equal(f.calls.length,0);
});

test("928: wrong SQL role and uncertain COMMIT deny without releasing credentials",async()=>{
 for(const mode of [{badRole:true},{failAt:"COMMIT"}]){
  const f=fixture(mode);
  await assert.rejects(make(f)({requestPayload:payload,requestOrigin:origin}),err=>{
   assert.equal(err.message,"PAY54_BOOTSTRAP_SERVICE_UNAVAILABLE");
   assert.equal(err.message.includes("private-hostname"),false);
   return true;
  });
  assert.equal(f.calls.at(-1).sql,"ROLLBACK");
  assert.deepEqual(f.releases,[Boolean(mode.failAt)]);
 }
});
