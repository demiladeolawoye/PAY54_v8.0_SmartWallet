"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {loadPay54StagingWalletReaderConfiguration as load}
 from "../src/postgres-staging-wallet-reader-config.mjs";
import {createPay54WalletLiveIdentityProbe as createProbe}
 from "../src/postgres-wallet-live-identity-probe.mjs";

const config=()=>{
 const env={
  PAY54_ENV:"staging",PAY54_REAL_MONEY_MODE:"false",
  PAY54_STAGING_DB_CONNECTION_ALLOWED:"true",
  PAY54_STAGING_PG_HOST:"wallet-stage.internal.example",
  PAY54_STAGING_PG_DATABASE:"pay54_stage",PAY54_STAGING_PG_PORT:"5432",
  PAY54_STAGING_PG_CA_PEM:"-----BEGIN CERTIFICATE-----\n"+
    "A".repeat(256)+"\n-----END CERTIFICATE-----",
  PAY54_STAGING_SESSION_ISSUER_POOL_ENABLED:"true",
  PAY54_STAGING_WALLET_READER_POOL_ENABLED:"true",
  PAY54_STAGING_WALLET_READER_RELEASE_APPROVED:"false"
 };
 for(const [key,username] of [
  ["SESSION_READER","pay54_session_reader"],
  ["ACCOUNT_READER","pay54_account_reader"],
  ["SESSION_ROTATOR","pay54_session_rotator"],
  ["SESSION_ISSUER","pay54_session_issuer"],
  ["WALLET_READER","pay54_wallet_reader"]
 ]){
  env["PAY54_STAGING_PG_"+key+"_USER"]=username;
  env["PAY54_STAGING_PG_"+key+"_PASSWORD"]="S".repeat(40)+key+"-"+username;
 }
 return env;
};
test("fifth dedicated wallet pool pins hostname TLS and never approves staging",()=>{
 const result=load(config());
 assert.equal(result.schema,"pay54.staging-wallet-five-pool-configuration.v1");
 assert.equal(result.walletRead.ssl.rejectUnauthorized,true);
 assert.equal(result.walletRead.ssl.servername,"wallet-stage.internal.example");
 assert.equal(result.walletRead.ssl.minVersion,"TLSv1.2");
 assert.equal(result.walletRead.user,"pay54_wallet_reader");
 assert.equal(result.actualDatabaseLoginUnverified,true);
 assert.equal(result.stagingDeploymentAuthorised,false);
 assert.equal(result.customerWalletApiEnabled,false);
});
test("credential reuse, duplicate user, insecure flags and missing CA all deny",()=>{
 for(const patch of [
  {PAY54_STAGING_PG_WALLET_READER_PASSWORD:
   config().PAY54_STAGING_PG_SESSION_READER_PASSWORD},
  {PAY54_STAGING_PG_WALLET_READER_USER:"pay54_session_reader"},
  {PAY54_STAGING_WALLET_READER_RELEASE_APPROVED:"true"},
  {PAY54_REAL_MONEY_MODE:"true"},
  {PAY54_STAGING_PG_HOST:"127.0.0.1"},
  {PAY54_STAGING_PG_CA_PEM:"MISSING"}
 ])assert.throws(()=>load({...config(),...patch}),
  /PAY54_STAGING_WALLET_IDENTITY_DENIED/);
});
const verified=()=>({
 effective_role:"pay54_wallet_read_caller_role",login_role:"pay54_wallet_reader",
 read_only:"on",isolation:"read committed",ssl_in_use:true,tls_version:"TLSv1.3",
 function_only_caller:true,safe_login:true,delegated_membership:true,
 schema_usage:true,callable:true,all_forced_rls:true,
 ledger_direct:false,holds_direct:false,sessions_direct:false,ledger_write:false
});
function probe(row=verified(),errorAt){
 const queries=[],released=[];
 const db={connect:async()=>({
  async query(sql){queries.push(sql);
   if(errorAt&&sql.includes(errorAt))throw Error("PRIVATE_CLOUD_SECRET");
   if(sql.trimStart().startsWith("SELECT"))return {rows:[row]};
   return {rows:[]};
  },
  release(discard){released.push(discard);}
 })};
 return {p:createProbe({pool:db,expectedLogin:"pay54_wallet_reader"}),queries,released};
}
test("real-client protocol probe returns only bounded NO-GO identity evidence",async()=>{
 const f=probe(),result=await f.p.inspect();
 assert.equal(result.restrictedDatabaseIdentityObserved,true);
 assert.equal(result.backendConnectionTlsObserved,true);
 assert.equal(result.hostnameCaVerificationIndependentlyAttested,false);
 assert.equal(result.stagingDeploymentAuthorised,false);
 assert.deepEqual(f.released,[true]);
 assert.equal(f.queries[0],"BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY");
 assert.equal(f.queries.at(-1),"ROLLBACK");
});
for(const [name,part] of [
 ["wrong login",{login_role:"postgres"}],
 ["superuser",{safe_login:false}],
 ["wrong role",{effective_role:"postgres"}],
 ["SSL absent",{ssl_in_use:false}],
 ["TLS downgrade",{tls_version:"TLSv1.1"}],
 ["direct ledger access",{ledger_direct:true}],
 ["reservation read",{holds_direct:true}],
 ["session read",{sessions_direct:true}],
 ["writer privilege",{ledger_write:true}],
 ["missing forced RLS",{all_forced_rls:false}],
 ["missing EXECUTE",{callable:false}],
 ["missing membership",{delegated_membership:false}]
]){
 test("physical DB probe rejects "+name,async()=>{
  const f=probe({...verified(),...part});
  await assert.rejects(f.p.inspect(),
   e=>e.message==="PAY54_WALLET_STAGE_LIVE_IDENTITY_UNVERIFIED");
  assert.deepEqual(f.released,[true]);
 });
}
test("DB errors are masked and connection discarded",async()=>{
 const f=probe(verified(),"pg_stat_ssl");
 await assert.rejects(f.p.inspect(),
  e=>e.message==="PAY54_WALLET_STAGE_LIVE_IDENTITY_UNVERIFIED");
 assert.deepEqual(f.released,[true]);
});
