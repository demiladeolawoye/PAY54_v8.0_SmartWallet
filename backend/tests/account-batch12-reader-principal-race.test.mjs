"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import {createAccountContextReader}
 from "../domain/account-context-reader.mjs";
import {createAccountContextHandler}
 from "../http/account-context-handler.mjs";
import {createTrustedAccountPrincipalResolver}
 from "../domain/trusted-account-principal.mjs";

const P="11111111-1111-4111-8111-111111111111";
const OTHER="33333333-3333-4333-8333-333333333333";
const A="22222222-2222-4222-8222-222222222222";
const row={
 account_id:A,legal_owner_id:P,type:"PERSONAL",
 display_name:"Personal",status:"ACTIVE",
 verification_status:"VERIFIED",principal_id:P,
 role:"PERSONAL_OWNER",membership_status:"ACTIVE"
};
function response(){
 const result={headersSent:false,destroyed:false,status:null,body:null};
 result.writeHead=(code)=>{result.status=code;result.headersSent=true;};
 result.end=body=>{result.body=JSON.parse(body);};
 return result;
}
test("352: account catalogue rechecks session after asynchronous database work",async()=>{
 const request={session:true,principal:P};
 let reads=0;
 const reader=createAccountContextReader({
  resolveAuthenticatedPrincipal:async request=>{
   reads++;
   return request.session?request.principal:null;
  },
  query:async()=>{request.session=false;return {rows:[row]};}
 });
 await assert.rejects(reader.listForRequest(request),/ACCOUNT_AUTH_REQUIRED/);
 assert.equal(reads,2);
});
test("352: principal replacement between query and response cannot expose old accounts",async()=>{
 const request={session:true,principal:P};
 const reader=createAccountContextReader({
  resolveAuthenticatedPrincipal:async req=>req.principal,
  query:async()=>{request.principal=OTHER;return {rows:[row]};}
 });
 await assert.rejects(reader.selectForRequest(request,A),/ACCOUNT_AUTH_REQUIRED/);
});
test("352: stable, authenticated personal read preserves existing semantics",async()=>{
 const reader=createAccountContextReader({
  resolveAuthenticatedPrincipal:async()=>P,
  query:async()=>({rows:[row]})
 });
 assert.deepEqual((await reader.listForRequest({})).map(a=>a.accountId),[A]);
 assert.equal((await reader.selectForRequest({},A)).accountId,A);
});
test("352: account HTTP handler cannot emit accounts after session revocation during query",async()=>{
 const request={
  url:"/api/v1/account-contexts",
  method:"GET",
  session:true
 };
 const principalResolver=createTrustedAccountPrincipalResolver({
  verifyServerSession:async req=>req.session?{
   authenticated:true,revoked:false,subjectId:P,
   expiresAt:Math.floor(Date.now()/1000)+60
  }:null
 });
 const handler=createAccountContextHandler({
  principalResolver,
  query:async()=>{request.session=false;return {rows:[row]};}
 });
 const result=response();
 assert.equal(await handler(request,result),true);
 assert.equal(result.status,401);
 assert.equal(Object.hasOwn(result.body,"accounts"),false);
 assert.equal(JSON.stringify(result.body).includes(P),false);
});
test("352: unauthenticated principal never reaches the database",async()=>{
 let queries=0;
 const reader=createAccountContextReader({
  resolveAuthenticatedPrincipal:async()=>null,
  query:async()=>{queries++;return {rows:[row]};}
 });
 await assert.rejects(reader.listForRequest({}),/ACCOUNT_AUTH_REQUIRED/);
 assert.equal(queries,0);
});
