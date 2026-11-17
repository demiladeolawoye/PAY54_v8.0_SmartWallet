"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  createPay54PostgresInitialAccountBinding as createBinding,
  createPay54PostgresSessionRotation as createRotation,
  PAY54_ROTATION_SQL
} from "../src/postgres-session-rotation.mjs";

const actor="11111111-1111-4111-8111-111111111111";
const origin="https://wallet.example";
const token=randomBytes(32).toString("base64url");
const csrf=randomBytes(32).toString("base64url");
const headers={
  authorization:"Bearer "+token,
  "x-pay54-csrf":csrf,origin
};
const requestContext={headers};
const requestPayload={requestedAccountId:actor};
const session={
  sessionId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  principalId:actor,activeAccountId:null,status:"ACTIVE",
  version:1,issuedAtMs:1000,expiresAtMs:400000
};
function make({activeAccountId=null,badRole=false}={}){
 const queries=[],releases=[];
 const pool={async connect(){return{
  async query(sql,params){
   queries.push({sql,params});
   if(sql.startsWith("SELECT current_user AS role_name"))return {rows:[{
    role_name:badRole?"postgres":"pay54_session_rotate_role",
    restricted:!badRole,may_rotate:true,may_write_ledger:false,
    may_write_sessions:false,may_append_audit:false
   }]};
   if(sql.includes("FROM pay54.bind_initial_account_session"))
    return {rows:[{sessionId:params[2],version:"2"}]};
   return {rows:[]};
  },
  release(discard=false){releases.push(discard);}
 }}};
 const source={...session,activeAccountId};
 const binding=createBinding({
  writePool:pool,
  resolveAuthenticatedSession:async()=>source,
  trustedApplicationOrigin:origin,
  getTrustedServerTimeMs:()=>2000
 });
 return {binding,queries,releases,source,pool};
}
test("939: first binding reuses canonical hardened role, CSRF and COMMIT machinery",async()=>{
 const f=make();
 const result=await f.binding({requestContext,requestPayload});
 assert.equal(result.schema,"pay54.initial-account-binding-committed.v1");
 assert.equal(result.sessionVersion,2);
 assert.equal(result.requestedAccountId,actor);
 assert.equal(result.paymentAuthorised,false);
 assert.equal(result.productionHttpRouteActivated,false);
 assert.equal(f.queries.at(-1).sql,"COMMIT");
 const sql=f.queries.find(x=>x.sql.includes("FROM pay54.bind_initial_account_session"));
 assert.equal(sql.params[5],actor);
 assert.notEqual(result.bearerToken,token);
 assert.notEqual(result.csrfToken,csrf);
 assert.deepEqual(f.releases,[false]);
 assert.ok(PAY54_ROTATION_SQL.BIND_ROLE_SQL.includes(
  "pay54.bind_initial_account_session("));
});
test("939: first binding refuses already-selected account and wrong role",async()=>{
 for(const options of [{activeAccountId:actor},{badRole:true}]){
  const f=make(options);
  await assert.rejects(f.binding({requestContext,requestPayload}),
    /ACCOUNT_ROTATION_UNAVAILABLE/);
  assert.equal(f.queries.some(q=>q.sql==="COMMIT"),false);
 }
});
test("939: existing rotation entry point still refuses account-unbound session",async()=>{
 const f=make();
 const rotate=createRotation({
  writePool:f.pool,resolveAuthenticatedSession:async()=>f.source,
  trustedApplicationOrigin:origin,getTrustedServerTimeMs:()=>2000
 });
 await assert.rejects(rotate({requestContext,requestPayload}),
   /ACCOUNT_ROTATION_UNAVAILABLE/);
 assert.equal(f.queries.length,0);
});
