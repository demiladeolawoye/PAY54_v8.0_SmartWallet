"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {projectAccountError} from "../http/account-error-boundary.mjs";
test("customer enumeration denied with a uniform generic response",()=>{
 const denied=projectAccountError({code:"ACCESS_DENIED",sql:"SELECT * FROM customers",
  token:"secret",accountId:"sensitive"});
 assert.equal(denied.status,404);
 assert.equal(denied.headers["Cache-Control"],"no-store, private");
 assert.deepEqual(JSON.parse(denied.body),{error:"ACCOUNT_REQUEST_UNAVAILABLE"});
 assert.equal(JSON.stringify(denied).includes("secret"),false);
 assert.equal(denied.financialExecutionEnabled,false);
});
test("unapproved or arbitrary error classes cannot be exposed",()=>{
 for(const code of ["SQL_CONNECTION_LOST","debug","",null]){
  assert.throws(()=>projectAccountError({code}),/ACCOUNT_ERROR_CLASS_INVALID/);
 }
 assert.equal(projectAccountError({code:"AUTH_REQUIRED"}).status,401);
 assert.equal(projectAccountError({code:"RATE_LIMITED"}).status,429);
});
