"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {classifyPay54PublicAuditPath as classify}
 from "../governance/pay54-batch27-public-path-report.mjs";
test("1123: sensitive filename excluded while category retained",()=>{
 const r=classify({path:"backend/src/secret-auth.mjs"});
 assert.equal(r.category,"BACKEND_SOURCE");
 assert.equal(JSON.stringify(r).includes("secret-auth"),false);
 assert.equal(r.actualUrlProbed,false);
});
test("1123: static site file not considered confidential backend source",()=>{
 assert.equal(classify({path:"assets/css/dashboard.css"}).category,"STATIC_ASSET");
 assert.throws(()=>classify({path:"../etc/passwd"}),
 /PUBLIC_PATH_REPORT_DENIED/);
});
