"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54StagingAcceptanceClaims as assess}
 from "../governance/pay54-batch27-staging-acceptance.mjs";
const items=["identity-provider-contract","mfa-customer-recovery",
 "four-distinct-postgres-logins","tls-and-rls-proven",
 "ordered-migrations-001-020","pitr-restore-rehearsal",
 "distributed-atomic-auth-limiter","account-device-qa",
 "source-artifact-provenance","protected-deployer-oidc"];
const claims=Object.fromEntries(items.map(key=>[key,true]));
test("1090: even fully claimed staging evidence cannot authorise infrastructure",()=>{
 const r=assess({claims});
 assert.equal(r.structurallyReadyForIndependentValidation,true);
 assert.equal(r.stagingEnvironmentActuallyVerified,false);
 assert.equal(r.stagingProvisioningAuthorised,false);
});
test("1090: missing MFA, RLS or replay protection cannot pass review inventory",()=>{
 const changes=[{"mfa-customer-recovery":false},
  {"tls-and-rls-proven":false},
  {"distributed-atomic-auth-limiter":false}];
 for(const c of changes){
  const r=assess({claims:{...claims,...c}});
  assert.equal(r.structurallyReadyForIndependentValidation,false);
  assert.ok(r.missingEvidenceCategories.length>0);
 }
 assert.throws(()=>assess({claims:{...claims,extra:true}}),
  /STAGING_ACCEPTANCE_REVIEW_DENIED/);
});
