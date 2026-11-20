"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54AccountRouteActivation as inspect}
 from "../governance/pay54-batch27-session-route-gate.mjs";
const names=["realIdentityProvider","strongMfa","antiReplayConsumption",
 "distributedRateLimiter","fourPostgresRoles","rbacAndRlsVerified",
 "sessionRevocation","csrfOriginValidation","auditAtomicity",
 "deviceCacheIsolation","securityIncidentMonitoring"];
const controls=Object.fromEntries(names.map(x=>[x,true]));
test("1098: account routes remain disabled even with complete self-reported preflight",()=>{
 const r=inspect({controls});
 assert.equal(r.allPreconditionsClaimed,true);
 assert.equal(r.accountHttpRoutesEnabled,false);
 assert.equal(r.financialExecutionAuthorised,false);
});
test("1098: disabling MFA, rate limits and CSRF marks missing independently",()=>{
 for(const key of ["strongMfa","distributedRateLimiter",
  "csrfOriginValidation","rbacAndRlsVerified"]){
  const r=inspect({controls:{...controls,[key]:false}});
  assert.ok(r.claimedMissing.includes(key));
  assert.equal(r.allPreconditionsClaimed,false);
 }
 assert.throws(()=>inspect({controls:{...controls,ledgerHack:true}}),
 /ACCOUNT_ROUTE_ACTIVATION_DENIED/);
});
