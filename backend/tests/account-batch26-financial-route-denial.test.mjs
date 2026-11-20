"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54FinancialRouteDenial as inspect}
 from "../governance/pay54-batch26-financial-route-denial.mjs";
import {createApp} from "../src/server.mjs";
test("1044: actual backend source retains 503 financial and account refusals",()=>{
 const r=inspect();assert.equal(r.financialExecutionUnavailableSourcePresent,true);
 assert.equal(r.realMoneyEnabled,false);
 assert.throws(()=>inspect({source:"POST /payments 200 OK"}),
  /FINANCIAL_ROUTE_DENIAL_DRIFT/);
});
test("1044: live loopback foundation still rejects account and money operations",async t=>{
 const app=createApp({mode:"test"});
 await new Promise((yes,no)=>{app.once("error",no);app.listen(0,"127.0.0.1",yes);});
 t.after(()=>new Promise(ok=>app.close(()=>ok())));
 const root="http://127.0.0.1:"+app.address().port;
 for(const path of ["/v1/accounts","/v1/account-context","/v1/financial-operations"]){
  const r=await fetch(root+path,{method:path.endsWith("operations")?"POST":"GET",
   ...(path.endsWith("operations")?{body:"{}",headers:{"content-type":"application/json"}}:{})});
  assert.equal(r.status,503);
  assert.equal(r.headers.get("cache-control"),"no-store");
 }
});
