"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54IncidentRetentionPolicy as inspect}
 from "../governance/pay54-batch27-incident-retention.mjs";
const x={purpose:"SECURITY_INVESTIGATION",retentionDays:90,
 accessRestricted:true,immutableAudit:true,customerDataIncluded:false};
test("1125: security retention is not evidence storage or legal acceptance",()=>{
 const r=inspect(x);assert.equal(r.actualEvidenceStorageNotProvisioned,true);
 assert.equal(r.legalRetentionReviewStillRequired,true);
});
test("1125: unrestricted, excessive or customer-data-packed audit denied",()=>{
 for(const change of [{accessRestricted:false},
  {customerDataIncluded:true},{retentionDays:99999},
  {purpose:"MARKETING"}])
 assert.throws(()=>inspect({...x,...change}),
 /INCIDENT_EVIDENCE_RETENTION_DENIED/);
});
