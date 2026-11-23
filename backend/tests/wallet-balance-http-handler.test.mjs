"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {once} from "node:events";
import {createPay54WalletBalanceHttpHandler as make}
 from "../src/wallet-balance-http-handler.mjs";

const A="22222222-2222-4222-8222-222222222222";
const B="33333333-3333-4333-8333-333333333333";
const token="Bearer "+"a".repeat(48);
const envelope=(account=A)=>({
 schema:"pay54.account-wallet-balance-read.v1",
 accountId:account,walletId:"44444444-4444-4444-8444-444444444444",
 sessionVersion:3,currency:"GBP",availableMinor:"0",
 asOfRevision:1,displayOnly:true,backendAuthenticationRequired:true,
 dataSourceProvenanceVerifiedByThisModule:false,
 financialExecutionAuthorised:false,productionReady:false
});
async function setup(service){
 let calls=0;
 // Actual loopback HTTP transport is used only in disposable Node tests.
 // Trusted deployment origin remains an HTTPS-only contract.
 const server=http.createServer();
 const handler=make({trustedOrigin:"https://wallet.example.test",
  authenticatedService:{async read(input){
   calls++;return service?service(input):envelope();
  }}});
 server.on("request",(req,res)=>{
  // Test runner transports over loopback HTTP; the handler validates
  // the expected externally authenticated HTTPS origin and Host.
  handler(req,res);
 });
 server.listen(0,"127.0.0.1");
 await once(server,"listening");
 const port=server.address().port;
 async function send({method="GET",path="/v1/accounts/"+A+"/wallet/balance",
 headers={},body}={}){
  return new Promise((resolve,reject)=>{
   const req=http.request({host:"127.0.0.1",port,method,path,headers:{
    host:"wallet.example.test",origin:"https://wallet.example.test",
    authorization:token,"sec-fetch-site":"same-origin",...headers
   }},res=>{
    let text="";res.setEncoding("utf8");
    res.on("data",x=>text+=x);
    res.on("end",()=>resolve({status:res.statusCode,
     headers:res.headers,body:text}));
   });
   req.on("error",reject);
   if(body!==undefined)req.write(body);
   req.end();
  });
 }
 return {server,send,get calls(){return calls;}};
}
test("real loopback HTTP request returns bounded display-only envelope",async t=>{
 const x=await setup();t.after(()=>x.server.close());
 const r=await x.send();
 assert.equal(r.status,200);assert.equal(r.headers["cache-control"],"no-store");
 assert.equal(JSON.parse(r.body).availableMinor,"0");
 assert.equal(x.calls,1);
});
test("cross-account path cannot obtain another customer's result",async t=>{
 const x=await setup();t.after(()=>x.server.close());
 const r=await x.send({path:"/v1/accounts/"+B+"/wallet/balance"});
 assert.equal(r.status,403);assert.equal(x.calls,1);
 assert.doesNotMatch(r.body,/44444444/);
});
test("wrong method, missing or forged origin, cookie, unsafe framing and token denied before service",async t=>{
 const x=await setup();t.after(()=>x.server.close());
 for(const q of [
  {method:"POST"},{path:"/v1/accounts/"+A+"/wallet/balance?currency=USD"},
  {headers:{origin:"https://attacker.invalid"}},
  {headers:{authorization:"Bearer bad"}},
  {headers:{authorization:""}},
  {headers:{cookie:"session=steal"}},
  {headers:{"content-type":"application/json"}},
  {headers:{"sec-fetch-site":"cross-site"}},
  {headers:{host:"evil.example.test"}}
 ]){
  const r=await x.send(q);
  assert.equal(r.status,403,JSON.stringify(q));
 }
 assert.equal(x.calls,0);
});
test("revocation or backend failure returns generic no-store denial",async t=>{
 const x=await setup(async()=>{throw Error("private-credential-and-customer");});
 t.after(()=>x.server.close());
 const r=await x.send();
 assert.equal(r.status,403);
 assert.equal(r.headers["cache-control"],"no-store");
 assert.deepEqual(JSON.parse(r.body),{error:"wallet_read_unavailable"});
 assert.doesNotMatch(r.body,/private-credential/);
});
test("unknown origin is never trusted as proxy configuration",()=>{
 assert.throws(()=>make({trustedOrigin:"http://wallet.example.test",
  authenticatedService:{read:async()=>envelope()}}),
  /PAY54_WALLET_HTTP_ADMISSION_DENIED/);
});
