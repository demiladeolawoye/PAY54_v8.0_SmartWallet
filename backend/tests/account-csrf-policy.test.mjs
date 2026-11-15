"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountCsrfPolicy} from "../security/account-csrf-policy.mjs";
const p=createAccountCsrfPolicy({trustedOrigins:["https://getpay54.com"]});
test("explicit HTTPS same-site browser origin can pass policy only",()=>{
 assert.equal(p.assertReadOrigin({origin:"https://getpay54.com","sec-fetch-site":"same-origin"}),true);
});
test("unknown, missing and cross-site origins always fail",()=>{
 for(const headers of [
  {},{origin:"https://evil.example"},{origin:"http://getpay54.com"},
  {origin:"https://getpay54.com","sec-fetch-site":"cross-site"},
  {origin:"https://getpay54.com.evil.example"}
 ])assert.throws(()=>p.assertReadOrigin(headers),/ORIGIN_NOT_AUTHORISED/);
});
test("malformed origin configuration cannot be silently trusted",()=>{
 for(const value of ["http://getpay54.com","https://getpay54.com/path","https://user@getpay54.com","https://localhost"]){
  assert.throws(()=>createAccountCsrfPolicy({trustedOrigins:[value]}),TypeError);
 }
});
