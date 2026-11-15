"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { createAccountContextHandler } from "../http/account-context-handler.mjs";
import { createTrustedAccountPrincipalResolver } from "../domain/trusted-account-principal.mjs";
const P="11111111-1111-4111-8111-111111111111";
const A="22222222-2222-4222-8222-222222222222";
const principalResolver=createTrustedAccountPrincipalResolver({
  verifyServerSession: async request=> request.session===true
    ? {subjectId:P,authenticated:true,revoked:false,expiresAt:Math.floor(Date.now()/1000)+60}
    : null
});
const row={
  account_id:A,legal_owner_id:P,type:"PERSONAL",display_name:"Personal",
  status:"ACTIVE",verification_status:"VERIFIED",
  principal_id:P,role:"PERSONAL_OWNER",membership_status:"ACTIVE"
};
const response=()=>{
  const res={headersSent:false,destroyed:false,status:null,headers:null,body:null};
  res.writeHead=(status,headers)=>{res.status=status;res.headers=headers;res.headersSent=true;};
  res.end=body=>{res.body=JSON.parse(body);};
  return res;
};
const create=(rows=[row],calls=[])=>createAccountContextHandler({
  principalResolver,
  query:async(sql,values)=>{calls.push({sql,values});return {rows};}
});
test("no automatic listener and unrelated routes stay untouched",async()=>{
  const r=response();
  assert.equal(await create()({url:"/health/live",method:"GET",session:true},r),false);
  assert.equal(r.headersSent,false);
});
test("unauthenticated account calls fail without accessing database",async()=>{
  const calls=[];
  const r=response();
  await create([row],calls)({url:"/api/v1/account-contexts",method:"GET"},r);
  assert.equal(r.status,401);
  assert.equal(calls.length,0);
});
test("list response excludes sensitive legal owner and membership",async()=>{
  const r=response();
  await create()({url:"/api/v1/account-contexts",method:"GET",session:true},r);
  assert.equal(r.status,200);
  assert.deepEqual(r.body.accounts,[{accountId:A,type:"PERSONAL",displayName:"Personal"}]);
  assert.equal(JSON.stringify(r.body).includes(P),false);
  assert.equal(r.headers["Cache-Control"],"no-store, private");
});
test("selection rechecks account ID even with untrusted adapter results",async()=>{
  const r=response();
  const b="33333333-3333-4333-8333-333333333333";
  await create()({url:"/api/v1/account-contexts/"+b,method:"GET",session:true},r);
  assert.equal(r.status,404);
});
test("invalid IDs, unsupported methods and store failures never leak data",async()=>{
  for(const [url,method,status] of [
    ["/api/v1/account-contexts/invalid","GET",404],
    ["/api/v1/account-contexts","POST",405],
    ["/api/v1/account-contexts/"+A,"DELETE",405]
  ]){
    const r=response();
    await create()({url,method,session:true},r);
    assert.equal(r.status,status);
  }
  const r=response();
  const h=createAccountContextHandler({principalResolver,query:async()=>{throw Error("db connection string")}});
  await h({url:"/api/v1/account-contexts",method:"GET",session:true},r);
  assert.equal(r.status,503);
  assert.equal(JSON.stringify(r.body).includes("connection"),false);
});

test("account handler rejects malformed, oversized and suspicious paths before DB access",async()=>{
 const invalid=[
  "/api/v1/account-contexts?accountId="+A,
  "/api/v1/account-contexts/%32"+A.slice(2),
  "/api/v1/account-contexts/../account-contexts",
  "/api/v1/account-contexts/"+A+"?page=1",
  "/api/v1/account-contexts/"+A+"#fragment",
  "/api/v1/account-contexts/"+A+"\\\\unexpected",
  "/api/v1/account-contexts/"+"a".repeat(2049)
 ];
 let count=0;
 const h=createAccountContextHandler({principalResolver,query:async()=>{
   count++;return {rows:[row]};
 }});
 for(const url of invalid){
   const r=response();
   await h({url,method:"GET",session:true},r);
   assert.notEqual(r.status,200,url);
 }
 assert.equal(count,0);
});
test("safe unknown routes are not intercepted and request lists remain private",async()=>{
 const r=response();
 assert.equal(await create()({url:"/not-an-account-route",method:"GET"},r),false);
 assert.equal(r.headersSent,false);
});

test("account responses cannot be cached by proxies or displayed cross-origin",async()=>{
 const h=create();
 const ok=response();
 await h({url:"/api/v1/account-contexts",method:"GET",session:true},ok);
 assert.equal(ok.status,200);
 assert.equal(ok.headers["Cross-Origin-Resource-Policy"],"same-origin");
 assert.equal(ok.headers["Vary"],"Cookie, Authorization");
 assert.equal(ok.headers["Pragma"],"no-cache");
 assert.equal(ok.headers["Expires"],"0");
 assert.equal(ok.headers["X-Frame-Options"],"DENY");
 assert.equal(ok.headers["Access-Control-Allow-Origin"],undefined);
 const denied=response();
 await h({url:"/api/v1/account-contexts",method:"GET",session:true,
   headers:{origin:"https://unauthorised.example"}},denied);
 assert.equal(denied.status,403);
 assert.equal(denied.headers["Access-Control-Allow-Origin"],undefined);
 assert.equal(denied.headers["Cache-Control"],"no-store, private");
});
