"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountReadTransaction} from "../db/account-read-transaction.mjs";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
const A="11111111-1111-4111-8111-111111111111";
const B="22222222-2222-4222-8222-222222222222";
const sql="SELECT principal_id FROM safe_account_query WHERE principal_id=$1";
const identity=createTrustedAccountPrincipalResolver({verifyServerSession:async req=>({
 subjectId:req.subject,authenticated:true,revoked:false,expiresAt:Math.floor(Date.now()/1000)+3600
})});
test("simultaneous account reads have separate transaction scope and parameter isolation",async()=>{
 let sequence=0;
 const sessions=[];
 const pool={async connect(){
  const number=++sequence;
  const trace=[];
  const client={
   async query(command,params){
    trace.push({command,params});
    await Promise.resolve();
    if(command===sql)return {rows:[{principal:params[0],session:number}]};
    return {rows:[]};
   },
   release(discard){client.discard=discard;}
  };
  sessions.push({number,trace,client});return client;
 }};
 const adapter=createAccountReadTransaction({pool,assertReadStatement:(statement,params,principal)=>{
  assert.equal(statement,sql);assert.deepEqual(params,[principal]);
 }});
 const [pA,pB]=await Promise.all([identity.resolve({subject:A}),identity.resolve({subject:B})]);
 const [rA,rB]=await Promise.all([
  adapter.execute({principal:pA,sql,params:[A]}),
  adapter.execute({principal:pB,sql,params:[B]})
 ]);
 assert.deepEqual(rA.rows,[{principal:A,session:1}]);
 assert.deepEqual(rB.rows,[{principal:B,session:2}]);
 assert.equal(sessions.length,2);
 for(const session of sessions){
  assert.equal(session.trace[0].command,"BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED READ ONLY");
  assert.equal(session.trace.at(-1).command,"COMMIT");
  assert.equal(session.client.discard,false);
  assert.equal(session.trace.filter(x=>x.command===sql).length,1);
 }
});
test("failed commit invalidates the pool client instead of pretending success",async()=>{
 const seen=[];
 const pool={async connect(){return {
  async query(command){
   seen.push(command);
   if(command==="COMMIT")throw Error("COMMIT_UNAVAILABLE");
   return {rows:[]};
  },
  release(discard){seen.push(["release",discard]);}
 };}};
 const adapter=createAccountReadTransaction({pool,assertReadStatement:()=>true});
 const principal=await identity.resolve({subject:A});
 await assert.rejects(()=>adapter.execute({principal,sql,params:[A]}),/COMMIT_UNAVAILABLE/);
 assert.equal(seen.includes("ROLLBACK"),true);
 assert.deepEqual(seen.at(-1),["release",true]);
});
