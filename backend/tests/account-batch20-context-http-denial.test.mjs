"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createApp} from "../src/server.mjs";

async function withServer(run) {
  const server=createApp({mode:"test",realMoneyMode:false});
  await new Promise((resolve,reject)=>{
    server.once("error",reject);
    server.listen(0,"127.0.0.1",resolve);
  });
  try {
    const port=server.address().port;
    await run(path=>`http://127.0.0.1:${port}${path}`);
  } finally {
    await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  }
}
test("762: account enumeration and selection fail closed on unprovisioned backend",async()=>{
  await withServer(async url=>{
    for(const [path,method] of [
      ["/v1/accounts","GET"],["/v1/account-context","GET"],
      ["/v1/account-context","POST"],["/v1/account-context/select","POST"],
      ["/v1/account-context/refresh","GET"],["/v1/account-context?account=secret","GET"]
    ]){
      const res=await fetch(url(path),{
        method,redirect:"manual",
        headers:{"content-type":"application/json"},
        ...(method==="POST"?{body:'{"accountId":"secret-value"}'}:{})
      });
      assert.equal(res.status,503,`${method} ${path}`);
      assert.equal(res.headers.get("cache-control"),"no-store");
      assert.equal(res.headers.get("x-content-type-options"),"nosniff");
      assert.equal(res.headers.get("referrer-policy"),"no-referrer");
      assert.match(res.headers.get("x-correlation-id")??"",/^[0-9a-f-]{36}$/);
      const body=await res.json();
      assert.equal(body.code,"ACCOUNT_CONTEXT_SERVICE_UNAVAILABLE");
      assert.equal(body.status,503);
      assert.ok(!JSON.stringify(body).includes("secret-value"));
    }
  });
});
test("762: login context refusal preserves existing health and financial denial boundaries",async()=>{
  await withServer(async url=>{
    const live=await fetch(url("/health/live"));
    assert.equal(live.status,200);
    assert.equal((await live.json()).status,"ok");
    const ready=await fetch(url("/health/ready"));
    assert.equal(ready.status,503);
    assert.equal((await ready.json()).code,"BACKEND_NOT_READY");
    const finance=await fetch(url("/v1/financial-operations/transfer"));
    assert.equal(finance.status,503);
    assert.equal((await finance.json()).code,"FINANCIAL_EXECUTION_UNAVAILABLE");
  });
});
