"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {consolidatePay54PublicExposureReview as run}
 from "../governance/pay54-batch27-public-exposure-report.mjs";
const base={incidentId:"PAY54-SEC-2026",
 observations:[{path:"backend/src/server.mjs",classification:"NOT_VERIFIED"},
  {path:"docs/internal.md",classification:"POTENTIAL_EXPOSURE"}]};
test("1075: aggregating incident observations never means independent confirmation",()=>{
 const r=run(base);assert.equal(r.reportedPotentialCount,1);
 assert.equal(r.containmentProven,false);
});
test("1075: duplicate paths and invented safe status rejected",()=>{
 for(const value of [
  {...base,observations:[...base.observations,base.observations[0]]},
  {...base,observations:[{path:"../private",classification:"NOT_VERIFIED"}]},
  {...base,observations:[{path:"backend/server",classification:"SAFE"}]},
  {...base,incidentId:"not-tracked"}
 ])assert.throws(()=>run(value),/PUBLIC_EXPOSURE_REPORT_DENIED/);
});
