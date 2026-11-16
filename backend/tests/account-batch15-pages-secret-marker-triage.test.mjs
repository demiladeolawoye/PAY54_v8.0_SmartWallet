"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {reviewPay54PagesSecretMarkerEvidence}
 from "../governance/pay54-pages-secret-marker-triage.mjs";

test("492: artifact test-fixture marker is a review item, never proof of a credential leak",()=>{
 const result=reviewPay54PagesSecretMarkerEvidence({findings:[{
  path:"backend/tests/account-batch11-proposed-site-content-review.test.mjs",
  ruleId:"PRIVATE_KEY_BLOCK"
 }]});
 assert.equal(result.markerCount,1);
 assert.equal(result.unresolvedCount,0);
 assert.equal(result.reviewed[0].classification,"TEST_FIXTURE_CANDIDATE");
 assert.equal(result.ownerSecurityReviewRequired,true);
 assert.equal(result.credentialCompromiseEstablished,false);
 assert.equal(result.actualPublicDisclosureConfirmed,false);
 assert.equal(result.productionRelease,"BLOCKED");
});
test("492: marker outside test paths remains unresolved without exposing source bytes",()=>{
 const result=reviewPay54PagesSecretMarkerEvidence({findings:[{
  path:"backend/secrets/account-key.js",ruleId:"PRIVATE_KEY_BLOCK"
 }]});
 assert.equal(result.unresolvedCount,1);
 assert.equal(result.reviewed[0].classification,"UNRESOLVED_CREDENTIAL_MARKER");
 assert.equal(JSON.stringify(result).includes("account-key.js"),false);
 assert.equal(result.credentialCompromiseEstablished,false);
});
test("492: source traversal, forged pattern rule and unstructured evidence fail closed",()=>{
 const result=reviewPay54PagesSecretMarkerEvidence({findings:[
  {path:"../outside.js",ruleId:"PRIVATE_KEY_BLOCK"},
  {path:"assets/js/app.js",ruleId:"UNKNOWN_SECRET"},
  {path:"/root/secret.js",ruleId:"GITHUB_TOKEN"}
 ]});
 assert.equal(result.issues.length,3);
 assert.equal(result.ownerSecurityReviewRequired,true);
 assert.equal(result.releaseAuthorised,false);
 assert.throws(()=>reviewPay54PagesSecretMarkerEvidence({findings:null}),/LIST_REQUIRED/);
});
test("492: zero marker hits do not establish overall secret safety",()=>{
 const result=reviewPay54PagesSecretMarkerEvidence({findings:[]});
 assert.equal(result.markerCount,0);
 assert.equal(result.independentCredentialValidityVerified,false);
 assert.equal(result.actualPublicDisclosureConfirmed,false);
 assert.equal(result.productionRelease,"BLOCKED");
});
