"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54MfaChallengeEvidence as inspect}
 from "../governance/pay54-batch27-auth-challenge-proof.mjs";
const x={challengeDigest:"a".repeat(64),deviceBindingDigest:"b".repeat(64),
 issuedAtMs:1800000000000,expiresAtMs:1800000120000,
 nowMs:1800000030000,oneTimeConsumed:true};
test("1165: valid bounded MFA challenge does not issue a session",()=>{
 const r=inspect(x);
 assert.equal(r.challengeWithinLifetime,true);
 assert.equal(r.underlyingAuthenticatorIndependentlyVerified,false);
 assert.equal(r.customerSessionIssued,false);
});
test("1165: expired, long-life and shared challenge/device digest rejected or denied",()=>{
 assert.equal(inspect({...x,nowMs:x.expiresAtMs})
  .challengeWithinLifetime,false);
 assert.throws(()=>inspect({...x,expiresAtMs:x.issuedAtMs+3600000}),
 /MFA_CHALLENGE_EVIDENCE_DENIED/);
 assert.throws(()=>inspect({...x,deviceBindingDigest:x.challengeDigest}),
 /MFA_CHALLENGE_EVIDENCE_DENIED/);
});
