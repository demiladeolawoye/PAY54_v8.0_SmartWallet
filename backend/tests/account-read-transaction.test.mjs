"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { createTrustedAccountPrincipalResolver } from "../domain/trusted-account-principal.mjs";
import { createAccountReadTransaction } from "../db/account-read-transaction.mjs";

const SUBJECT="11111111-1111-4111-8111-111111111111";
const trusted=createTrustedAccountPrincipalResolver({
  verifyServerSession:async()=>({authenticated:true,revoked:false,
    subjectId:SUBJECT,expiresAt:Math.floor(Date.now()/1000)+3600})
});
const principal=()=>trusted.resolve({});
const makePool=({errorAt=null,rows=[{account_id:"record"}]}={})=>{
  const sessions=[];
  const pool={async connect(){
    const statements=[];
    const client={
      async query(sql,params){
        statements.push({sql,params});
        if(errorAt && sql.includes(errorAt))throw Error("DATABASE_REJECTED");
        return sql==="SELECT account_id FROM pay54.account_contexts WHERE legal_owner_subject = $1"
          ? {rows} : {rows:[]};
      },
      release(discard){client.discard=discard;}
    };
    sessions.push({statements,client});return client;
  }};
  return {pool,sessions};
};
const sql="SELECT account_id FROM pay54.account_contexts WHERE legal_owner_subject = $1";
const permit=(statement,values,p)=> {
  assert.equal(statement,sql);
  assert.deepEqual(values,[p]);
};

test("one clean read-only transaction per operation, with no mutable session state",async()=>{
 const {pool,sessions}=makePool();
 const adapter=createAccountReadTransaction({pool,assertReadStatement:permit});
 const p=await principal();
 const one=await adapter.execute({principal:p,sql,params:[SUBJECT]});
 const two=await adapter.execute({principal:p,sql,params:[SUBJECT]});
 assert.deepEqual(one.rows,[{account_id:"record"}]);
 assert.ok(Object.isFrozen(one.rows));
 assert.equal(sessions.length,2);
 for(const item of sessions){
  const commands=item.statements.map(x=>x.sql);
  assert.deepEqual(commands,[
   "BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED READ ONLY",
   "SET LOCAL statement_timeout = '3000ms'",
   "SET LOCAL idle_in_transaction_session_timeout = '3000ms'",
   sql,
   "COMMIT"
  ]);
  assert.equal(item.client.discard,false);
 }
});
test("failed account query rolls back and discards client without contaminating next request",async()=>{
 const bad=makePool({errorAt:"SELECT account_id"});
 const adapter=createAccountReadTransaction({pool:bad.pool,assertReadStatement:permit});
 const p=await principal();
 await assert.rejects(()=>adapter.execute({principal:p,sql,params:[SUBJECT]}),/DATABASE_REJECTED/);
 assert.equal(bad.sessions[0].client.discard,true);
 assert.equal(bad.sessions[0].statements.at(-1).sql,"ROLLBACK");
 const good=makePool();
 const clean=createAccountReadTransaction({pool:good.pool,assertReadStatement:permit});
 assert.equal((await clean.execute({principal:p,sql,params:[SUBJECT]})).rows.length,1);
});
test("forged principals and rejected statements never acquire a pool client",async()=>{
 const {pool,sessions}=makePool();
 const adapter=createAccountReadTransaction({pool,assertReadStatement:permit});
 await assert.rejects(()=>adapter.execute({principal:{subjectId:SUBJECT},sql,params:[SUBJECT]}),/ACCOUNT_AUTH_REQUIRED/);
 const p=await principal();
 await assert.rejects(()=>adapter.execute({principal:p,sql:"DELETE FROM pay54.wallets",params:[SUBJECT]}));
 await assert.rejects(()=>adapter.execute({principal:p,sql,params:["wrong"]}));
 assert.equal(sessions.length,0);
});
test("oversized read results fail closed and release client for disposal",async()=>{
 const large=makePool({rows:Array.from({length:101},(_,i)=>({i}))});
 const adapter=createAccountReadTransaction({pool:large.pool,assertReadStatement:permit});
 const p=await principal();
 await assert.rejects(()=>adapter.execute({principal:p,sql,params:[SUBJECT]}),/ACCOUNT_READ_UNAVAILABLE/);
 assert.equal(large.sessions[0].client.discard,true);
});
