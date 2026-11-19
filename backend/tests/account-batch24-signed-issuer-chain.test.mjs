"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {loadPay54StagingIdentityTrust}
 from "../security/identity-staging-trust.mjs";
import {createPay54IdentityAccessVerifier}
 from "../security/identity-access-verifier.mjs";
import {createPay54PostgresBootstrapIssuer}
 from "../src/postgres-bootstrap-issuer.mjs";

const issuer="https://identity.pay54.example";
const origin="https://wallet.example";
const now=1800000000000;
const pair=generateKeyPairSync("ed25519"),attacker=generateKeyPairSync("ed25519");
const kid="pay54-staging-key-001";
const config=loadPay54StagingIdentityTrust({
 PAY54_ENV:"staging",PAY54_REAL_MONEY_MODE:"false",
 PAY54_STAGING_IDENTITY_TRUST_ENABLED:"true",
 PAY54_STAGING_IDENTITY_ISSUER:issuer,
 PAY54_STAGING_IDENTITY_AUDIENCE:"pay54:session-issuer",
 PAY54_STAGING_IDENTITY_KEYS_JSON:JSON.stringify({
  [kid]:pair.publicKey.export({format:"pem",type:"spki"})
 })
});
const claims={
 iss:issuer,aud:"pay54:session-issuer",
 sub:"11111111-1111-4111-8111-111111111111",
 jti:"99999999-9999-4999-8999-999999999999",
 iat:1800000000-10,nbf:1800000000-10,exp:1800000000+90,
 token_use:"access",scope:"pay54:session:issue"
};
const encode=value=>Buffer.from(JSON.stringify(value)).toString("base64url");
const signed=(source=claims,key=pair.privateKey)=>{
 const input=encode({alg:"EdDSA",typ:"at+jwt",kid})+"."+encode(source);
 return input+"."+sign(null,Buffer.from(input),key).toString("base64url");
};
const verifier=createPay54IdentityAccessVerifier({
 ...config,getTrustedServerTimeMs:()=>now
});
function fixture(){
 const queries=[];
 const pool={async connect(){return{
  async query(sql,params){
   queries.push({sql,params});
   if(sql.startsWith("SELECT current_user"))return {rows:[{
    role_name:"pay54_session_issue_role",restricted:true,
    may_issue:true,may_write_sessions:false,may_write_receipts:false,
    may_write_ledger:false
   }]};
   if(sql.includes("FROM pay54.consume_identity_assertion_and_issue_bootstrap"))
    return {rows:[{sessionId:params[4],expiresAtMs:String(now+60000)}]};
   return {rows:[]};
  },release(){}
 }}};
 return {queries,issuerService:createPay54PostgresBootstrapIssuer({
  writePool:pool,identityVerifier:verifier,
  trustedApplicationOrigin:origin,getTrustedServerTimeMs:()=>now
 })};
}
test("959: signed access token to issuer transaction never trusts role/client identity",async()=>{
 const f=fixture(),jwt=signed();
 const result=await f.issuerService({
  requestPayload:{accessAssertion:jwt},requestOrigin:origin
 });
 assert.equal(result.activeAccountId,null);
 assert.equal(result.moneyOperationAuthorised,false);
 assert.equal(f.queries.at(-1).sql,"COMMIT");
 assert.equal(JSON.stringify(f.queries).includes(jwt),false);
 const q=f.queries.find(x=>x.sql.includes("FROM pay54.consume_identity_assertion"));
 assert.equal(q.params[1],claims.sub);
 assert.equal(q.params[2],claims.jti);
});
test("959: forged signature, injected roles and wrong audience never call database",async()=>{
 for(const jwt of [
  signed(claims,attacker.privateKey),
  signed({...claims,role:"BUSINESS_OWNER"}),
  signed({...claims,aud:"other-audience"})
 ]){
  const f=fixture();
  await assert.rejects(f.issuerService({
   requestPayload:{accessAssertion:jwt},requestOrigin:origin
  }),/BOOTSTRAP_SERVICE_UNAVAILABLE/);
  assert.equal(f.queries.length,0);
 }
});
