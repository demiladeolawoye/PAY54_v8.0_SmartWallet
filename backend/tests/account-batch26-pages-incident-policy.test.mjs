"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54PagesIncident as assess}
 from "../governance/pay54-batch26-pages-incident-policy.mjs";
const base={signal:"POTENTIAL_PUBLIC_SOURCE_EXPOSURE",
 effectivePublicDeploymentAuthenticated:false,
 independentSourceHashMatch:false,operatorIncidentTicket:"PAY54-SEC-2026"};
test("1034: potential Pages exposure triggers escalation, not breach certainty",()=>{
 const r=assess(base);
 assert.equal(r.securityEscalationRequired,true);
 assert.equal(r.confirmedSourceExposure,false);
 assert.equal(r.operationalContainmentConfirmed,false);
 assert.equal(r.productionReleaseAuthorised,false);
});
test("1034: only independently authenticated source byte match changes classification",()=>{
 assert.equal(assess({...base,signal:"SOURCE_BYTES_CONFIRMED"})
  .confirmedSourceExposure,false);
 assert.equal(assess({...base,signal:"SOURCE_BYTES_CONFIRMED",
  effectivePublicDeploymentAuthenticated:true,
  independentSourceHashMatch:true}).confirmedSourceExposure,true);
});
test("1034: untracked incident or invented status denied",()=>{
 assert.throws(()=>assess({...base,signal:"CLEARED"}),/PAGES_INCIDENT_POLICY_DENIED/);
 assert.throws(()=>assess({...base,operatorIncidentTicket:"none"}),
  /PAGES_INCIDENT_POLICY_DENIED/);
});
