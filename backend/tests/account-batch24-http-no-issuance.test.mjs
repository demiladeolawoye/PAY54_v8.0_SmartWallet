"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createApp} from "../src/server.mjs";
test("960: bootstrap and initial account binding cannot be invoked through foundation HTTP",async t=>{
 const server=createApp({mode:"test"});
 await new Promise((resolve,reject)=>{
  server.once("error",reject);
  server.listen(0,"127.0.0.1",resolve);
 });
 t.after(()=>new Promise((resolve,reject)=>
  server.close(error=>error?reject(error):resolve())));
 const base="http://127.0.0.1:"+server.address().port;
 for(const [method,path,expectedCode,expectedStatus] of [
  ["POST","/v1/auth/bootstrap","ROUTE_NOT_FOUND",404],
  ["POST","/v1/auth/bootstrap?as=business","ROUTE_NOT_FOUND",404],
  ["POST","/v1/account-context/initial","ACCOUNT_CONTEXT_SERVICE_UNAVAILABLE",503],
  ["POST","/v1/account-context/switch","ACCOUNT_CONTEXT_SERVICE_UNAVAILABLE",503],
  ["GET","/v1/accounts","ACCOUNT_CONTEXT_SERVICE_UNAVAILABLE",503],
  ["POST","/v1/financial-operations","FINANCIAL_EXECUTION_UNAVAILABLE",503]
 ]){
  const response=await fetch(base+path,{
   method,redirect:"manual",
   headers:{"content-type":"application/json",
    origin:"https://wallet.example"},
   ...(method==="POST"?{body:JSON.stringify({
    accessAssertion:"forged",requestedAccountId:
    "11111111-1111-4111-8111-111111111111"
   })}:{})
  });
  assert.equal(response.status,expectedStatus,method+" "+path);
  assert.equal(response.headers.get("cache-control"),"no-store");
  const body=await response.json();
  assert.equal(body.code,expectedCode);
  assert.equal(JSON.stringify(body).includes("forged"),false);
 }
});
