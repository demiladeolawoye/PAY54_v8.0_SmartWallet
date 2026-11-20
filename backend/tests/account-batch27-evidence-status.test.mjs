"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {validatePay54EvidenceStateTransition as validate}
 from "../governance/pay54-batch27-evidence-status.mjs";
const fields={independentReviewerSigned:false,securityOfficerSigned:false,
 proofDigestPresent:false};
test("1092: first source evidence request remains unverified",()=>{
 const r=validate({from:"NOT_VERIFIED",to:"REQUESTED",...fields});
 assert.equal(r.structuralTransitionPermitted,true);
 assert.equal(r.systemStatusModified,false);
});
test("1092: cannot jump to operational closure or downgrade a signed incident",()=>{
 for(const x of [
  {from:"NOT_VERIFIED",to:"CLOSED_WITH_SIGNOFF",...fields},
  {from:"OBSERVED",to:"NOT_VERIFIED",...fields},
  {from:"OBSERVED",to:"INDEPENDENTLY_REVIEWED",...fields},
  {from:"INDEPENDENTLY_REVIEWED",to:"CLOSED_WITH_SIGNOFF",
   ...fields,independentReviewerSigned:true,proofDigestPresent:true}
 ])assert.throws(()=>validate(x),/EVIDENCE_STATUS_TRANSITION_DENIED/);
});
