"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createPay54PayTagRequestBinding,samePay54RequestDigest}
  from "../src/paytag-registration-request-binding.mjs";
const token=c=>Buffer.alloc(32,c).toString("base64url");
const baseAdmission=Object.freeze({
 schema:"pay54.paytag.registration-admission.v1",
 accountId:"11111111-1111-4111-8111-111111111111",
 principalId:"22222222-2222-4222-8222-222222222222",
 sessionId:"33333333-3333-4333-8333-333333333333",
 sessionVersion:3,
 canonicalAlias:"customer_tag",
 admissibleForTrustedDatabaseRevalidation:true,
 registryWriteAuthorised:false,
 financialExecutionEnabled:false
});
const newBinder=()=>createPay54PayTagRequestBinding({
 trustedApplicationOrigin:"https://app.getpay54.com",
 idempotencyHmacKey:Buffer.alloc(32,77)
});
const context=(key=token(3))=>({headers:{
 origin:"https://app.getpay54.com",authorization:"Bearer "+token(1),
 "x-pay54-csrf":token(2),"idempotency-key":key
}});
test("binding produces deterministic, account-scoped digest evidence and no permissions",()=>{
 const bind=newBinder();
 const a=bind({requestContext:context(),admission:baseAdmission});
 const b=bind({requestContext:context(),admission:baseAdmission});
 assert.deepEqual(a,b);
 assert.equal(a.requestDigest.length,64);
 assert.equal(a.idempotencyKeyDigest.length,64);
 assert.equal(a.csrfDigest.length,64);
 assert.equal(a.sessionTokenDigest.length,64);
 assert.equal(a.registryWriteAuthorised,false);
 assert.equal(a.paymentAuthorised,false);
 assert.equal(a.productionRelease,"BLOCKED");
 assert.equal(a.requiresSameTransactionDatabaseRevalidation,true);
 assert.equal(Object.isFrozen(a),true);
 assert.equal(samePay54RequestDigest(a.requestDigest,b.requestDigest),true);
});
test("same-account key deduplicates, different account and key never share digest",()=>{
 const bind=newBinder();
 const a=bind({requestContext:context(),admission:baseAdmission});
 const b=bind({requestContext:context(token(4)),admission:baseAdmission});
 const c=bind({requestContext:context(),
  admission:{...baseAdmission,accountId:"44444444-4444-4444-8444-444444444444"}});
 assert.notEqual(a.idempotencyKeyDigest,b.idempotencyKeyDigest);
 assert.notEqual(a.idempotencyKeyDigest,c.idempotencyKeyDigest);
 assert.notEqual(a.requestDigest,c.requestDigest);
 assert.equal(samePay54RequestDigest(a.requestDigest,b.requestDigest),true);
 assert.equal(samePay54RequestDigest(a.requestDigest,c.requestDigest),false);
});
test("changed session version or tag invalidates request digest",()=>{
 const bind=newBinder();
 const a=bind({requestContext:context(),admission:baseAdmission});
 for(const changes of [{sessionVersion:4},{canonicalAlias:"new_tag"},{sessionId:"55555555-5555-4555-8555-555555555555"}]){
  const other=bind({requestContext:context(),admission:{...baseAdmission,...changes}});
  assert.notEqual(a.requestDigest,other.requestDigest);
 }
});
test("origin, CSRF, bearer, idempotency and forged admission fail closed",()=>{
 const bind=newBinder();
 const attempts=[
  {...context(),headers:{...context().headers,origin:"https://fake.getpay54.com"}},
  {...context(),headers:{...context().headers,"x-pay54-csrf":"broken"}},
  {...context(),headers:{...context().headers,authorization:"Bearer forged"}},
  {...context(),headers:{...context().headers,"idempotency-key":"short"}},
  {headers:{...context().headers,origin:"http://app.getpay54.com"}},
 ];
 for(const req of attempts)assert.throws(
  ()=>bind({requestContext:req,admission:baseAdmission}),
  /PAY54_PAYTAG_REGISTRATION_REQUEST_DENIED|PAY54_TRUSTED_SESSION_UNAVAILABLE/);
 for(const change of [{registryWriteAuthorised:true},{financialExecutionEnabled:true},
  {admissibleForTrustedDatabaseRevalidation:false},{accountId:"not-uuid"},
  {canonicalAlias:"bad alias"},{sessionVersion:0}]){
  assert.throws(()=>bind({requestContext:context(),admission:{...baseAdmission,...change}}),
    /PAY54_PAYTAG_REGISTRATION_REQUEST_DENIED/);
 }
});
test("invalid service key and digest formats fail closed",()=>{
 assert.throws(()=>createPay54PayTagRequestBinding({
  trustedApplicationOrigin:"https://app.getpay54.com",idempotencyHmacKey:Buffer.alloc(16)
 }),/PAY54_PAYTAG_REGISTRATION_REQUEST_DENIED/);
 assert.throws(()=>samePay54RequestDigest("bad","f".repeat(64)),
  /PAY54_PAYTAG_REGISTRATION_REQUEST_DENIED/);
});
