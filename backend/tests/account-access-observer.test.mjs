"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAuditedAccountHandler} from "../http/account-access-observer.mjs";
import {createAccountAccessAudit} from "../security/account-access-audit.mjs";
const response=()=>({
 status:null,headers:null,body:null,
 writeHead(status,headers){this.status=status;this.headers=headers;},
 end(body){this.body=body;}
});
const handler=async (req,res)=>{
 if(req.url==="/health")return false;
 res.writeHead(req.allowed?200:401,{"Cache-Control":"no-store, private"});
 res.end(JSON.stringify({accountId:"22222222-2222-4222-8222-222222222222"}));
 return true;
};
test("success account response is released only after verified audit",async()=>{
 const sequence=[];const events=[];
 const wrapped=createAuditedAccountHandler({
  handler:async(req,res)=>{sequence.push("handle");return handler(req,res);},
  audit:createAccountAccessAudit({emitAuditEvent:async event=>{
   sequence.push("audit");events.push(event);
  }})
 });
 const res=response();const orig=res.writeHead.bind(res);
 res.writeHead=(status,headers)=>{sequence.push("send");orig(status,headers);};
 assert.equal(await wrapped({url:"/api/v1/account-contexts",allowed:true},res),true);
 assert.deepEqual(sequence,["handle","audit","send"]);
 assert.equal(res.status,200);
 assert.equal(events[0].operation,"ACCOUNT_LIST");
 assert.equal(events[0].outcome,"ALLOWED");
});
test("denials are audited without revealing principal or account ID",async()=>{
 const events=[];
 const wrapped=createAuditedAccountHandler({handler,audit:createAccountAccessAudit({
  emitAuditEvent:async event=>events.push(event)
 })});
 const res=response();
 await wrapped({url:"/api/v1/account-contexts/22222222-2222-4222-8222-222222222222"},res);
 assert.equal(res.status,401);
 assert.equal(events[0].operation,"ACCOUNT_SELECT");
 assert.equal(events[0].reason,"NO_SESSION");
 assert.equal(JSON.stringify(events).includes("22222222"),false);
});
test("audit sink outage prevents account response publication",async()=>{
 const wrapped=createAuditedAccountHandler({handler,audit:createAccountAccessAudit({
  emitAuditEvent:async()=>{throw Error("AUDIT_UNAVAILABLE");}
 })});
 const res=response();
 await assert.rejects(()=>wrapped({url:"/api/v1/account-contexts",allowed:true},res),/AUDIT_UNAVAILABLE/);
 assert.equal(res.status,null);
 assert.equal(res.body,null);
});
test("unrelated requests remain unhandled and malformed response is rejected",async()=>{
 const audit=createAccountAccessAudit({emitAuditEvent:async()=>{}});
 const wrapped=createAuditedAccountHandler({handler,audit});
 assert.equal(await wrapped({url:"/health"},response()),false);
 const bad=createAuditedAccountHandler({handler:async(req,res)=>{
  res.writeHead(200,{});res.end("x".repeat(17000));return true;
 },audit});
 await assert.rejects(()=>bad({url:"/api/v1/account-contexts"},response()),/ACCOUNT_RESPONSE_INVALID/);
});
