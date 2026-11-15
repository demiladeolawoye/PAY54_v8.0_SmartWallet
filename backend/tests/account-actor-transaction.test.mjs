"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {createAccountActorTransaction} from "../db/account-actor-transaction.mjs";
import {buildAccountQuery} from "../db/account-query-catalogue.mjs";
const P="11111111-1111-4111-8111-111111111111";
const Q="22222222-2222-4222-8222-222222222222";
const ROLE="pay54_tenant_safe_0001",OTHER_ROLE="pay54_tenant_safe_0002";
async function desc(){
 const r=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>({
  subjectId:P,authenticated:true,revoked:false,expiresAt:Math.floor(Date.now()/1000)+60
 })});
 return createAccountDbPrincipal({principal:await r.resolve({}),roleName:ROLE,
  assertRoleMapping:(id,role)=>id===P&&role===ROLE});
}
function mockPool({actor=ROLE,failAt}={}){
 const connections=[];
 return {connections,pool:{async connect(){
  const trace=[];
  const client={async query(statement,params){
   trace.push({statement,params});
   if(statement===failAt)throw Error("DB_FAILED");
   if(statement==="SELECT current_user::text AS actor")return {rows:[{actor}]};
   return {rows:[]};
  },release(discard){client.discard=discard;}};
  connections.push({trace,client});return client;
 }}};
}
test("verified database role and source principal together allow bounded read",async()=>{
 const dbPrincipal=await desc(),sample=mockPool();
 const plan=buildAccountQuery("ACCOUNT_LIST",P);
 const result=await createAccountActorTransaction({pool:sample.pool}).execute({
  dbPrincipal,sql:plan.sql,params:plan.params
 });
 assert.deepEqual(result.rows,[]);
 assert.equal(sample.connections[0].client.discard,false);
 assert.deepEqual(sample.connections[0].trace.filter(x=>x.statement==="SELECT current_user::text AS actor").length,1);
 assert.equal(sample.connections[0].trace.at(-1).statement,"COMMIT");
 assert.ok(sample.connections[0].trace.every(x=>!x.statement?.includes("SET ROLE")));
});
test("cross-tenant actor fails before SELECT with rollback and pool disposal",async()=>{
 const dbPrincipal=await desc(),sample=mockPool({actor:OTHER_ROLE});
 const plan=buildAccountQuery("ACCOUNT_LIST",P);
 await assert.rejects(()=>createAccountActorTransaction({pool:sample.pool}).execute({
  dbPrincipal,sql:plan.sql,params:plan.params
 }),/ACCOUNT_DB_ACTOR_MISMATCH/);
 assert.equal(sample.connections[0].client.discard,true);
 assert.equal(sample.connections[0].trace.at(-1).statement,"ROLLBACK");
 assert.equal(sample.connections[0].trace.some(x=>x.statement===plan.sql),false);
});
test("fake descriptor and cross-identity parameters never acquire connection",async()=>{
 const sample=mockPool(),dbPrincipal=await desc(),plan=buildAccountQuery("ACCOUNT_LIST",P);
 const adapter=createAccountActorTransaction({pool:sample.pool});
 await assert.rejects(()=>adapter.execute({dbPrincipal:{...dbPrincipal},sql:plan.sql,params:plan.params}),
  /DB_PRINCIPAL_DENIED/);
 await assert.rejects(()=>adapter.execute({dbPrincipal,sql:plan.sql,params:[Q]}),/UNAPPROVED_ACCOUNT_QUERY/);
 assert.equal(sample.connections.length,0);
});
test("read failure and failed commit discard uncertain database connection",async()=>{
 const dbPrincipal=await desc(),plan=buildAccountQuery("ACCOUNT_LIST",P);
 for(const failAt of [plan.sql,"COMMIT"]){
  const sample=mockPool({failAt});
  await assert.rejects(()=>createAccountActorTransaction({pool:sample.pool}).execute({
    dbPrincipal,sql:plan.sql,params:plan.params
  }),/DB_FAILED/);
  assert.equal(sample.connections[0].client.discard,true);
  assert.equal(sample.connections[0].trace.at(-1).statement,"ROLLBACK");
 }
});
