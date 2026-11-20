"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {inspectPay54DemoAuthCheckout as inspect,
 verifyPay54DemoAuthSources as verify}
 from "../release/pay54-demo-auth-checkout-guard.mjs";

const paths=["login.html","signup.html","forgot-pin.html",
 "create-new-pin.html","verify-otp.html"];
const sources=()=>{
 const auth=readFileSync(new URL("../../assets/js/auth.js",import.meta.url),"utf8");
 const entrypoint=readFileSync(new URL("../../index.html",import.meta.url),"utf8");
 const htmlPages=Object.fromEntries(paths.map(path=>[
  path,readFileSync(new URL("../../"+path,import.meta.url),"utf8")
 ]));
 return {auth,entrypoint,htmlPages};
};
test("1225: actual checkout contains only demo credential and auth claims",()=>{
 const r=inspect();
 assert.equal(r.checkedScreens,6);
 assert.equal(r.rawPinStorageStatementFound,false);
 assert.equal(r.financialServicesEnabled,false);
 assert.equal(r.browserProfileMayStillContainLegacyPIN,true);
 assert.equal(r.productionReleaseAuthorised,false);
});
test("1225: source regression introducing plaintext PIN or fake security denied",()=>{
 const input=sources();
 for(const changes of [
  {auth:input.auth+'\nlocalStorage.setItem("pay54_pin", pin);'},
  {entrypoint:input.entrypoint+'\nSecurity & Financial compliance active'},
  {htmlPages:{...input.htmlPages,
   "signup.html":input.htmlPages["signup.html"]+"Bank-grade protection"}},
  {auth:input.auth.replaceAll("PBKDF2-SHA256","unsafe-hash")}
 ])assert.throws(()=>verify({...input,...changes}),
 /DEMO_AUTH_SOURCE_BOUNDARY_DENIED/);
});
