"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { readPay54BootstrapHttpRequest as read }
 from "../security/identity-http-admission.mjs";
const origin="https://wallet.example";
const assertion="A".repeat(45)+"."+"B".repeat(85)+"."+"C".repeat(86);
const body=Buffer.from(JSON.stringify({accessAssertion:assertion}));
const make=({data=body,headers={},rawHeaders,method="POST",url="/v1/auth/bootstrap"}={})=>{
 const request=Readable.from([data]);
 request.method=method;request.url=url;
 request.headers={
  "content-type":"application/json",
  "content-length":String(data.length),
  origin,...headers
 };
 request.rawHeaders=rawHeaders??[
  "Content-Type","application/json",
  "Content-Length",String(data.length),"Origin",origin
 ];
 return request;
};
test("943: one bounded UTF-8 access assertion is admitted as still-unverified",async()=>{
 const result=await read({request:make(),trustedApplicationOrigin:origin});
 assert.equal(result.accessAssertion,assertion);
 assert.equal(result.sessionIssued,false);
 assert.ok(Object.isFrozen(result));
});
test("943: duplicate Origin/Content-Length and ambiguous HTTP framing rejected",async()=>{
 const cases=[
  {rawHeaders:["Origin",origin,"origin",origin,"Content-Type","application/json",
   "Content-Length",String(body.length)]},
  {headers:{"transfer-encoding":"chunked"}},
  {headers:{"cookie":"session=forged"}},
  {headers:{"authorization":"Bearer forged"}},
  {headers:{"x-forwarded-host":"evil.example"}},
  {headers:{"content-length":String(body.length-1)}},
  {headers:{"content-type":"application/json; charset=utf-8"}},
  {method:"GET"},{url:"/v1/auth/bootstrap?role=admin"},
  {data:Buffer.from('{"accessAssertion":"abc","accessAssertion":"'+assertion+'"}')},
  {data:Buffer.from(JSON.stringify({accessAssertion:assertion,principalId:"owner"}))}
 ];
 for(const c of cases){
  await assert.rejects(read({request:make(c),trustedApplicationOrigin:origin}),
    /BOOTSTRAP_HTTP_ADMISSION_DENIED/);
 }
});
test("943: invalid UTF-8 and oversized content fail closed before verifier",async()=>{
 const invalid=Buffer.from([0xc3,0x28]);
 await assert.rejects(read({request:make({data:invalid}),
  trustedApplicationOrigin:origin}),/BOOTSTRAP_HTTP_ADMISSION_DENIED/);
 const oversized=Buffer.alloc(13000,65);
 await assert.rejects(read({request:make({data:oversized}),
  trustedApplicationOrigin:origin}),/BOOTSTRAP_HTTP_ADMISSION_DENIED/);
});
