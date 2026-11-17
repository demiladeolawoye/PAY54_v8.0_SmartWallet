"use strict";
/** Batch27/1074 — decision ledger for observations without claiming incident closure. */
const deny=()=>{throw new Error("PAY54_PUBLIC_EXPOSURE_REPORT_DENIED");};
const STATES=new Set(["POTENTIAL_EXPOSURE","NOT_VERIFIED","CONFIRMED_EXPOSURE","NO_MATCH_OBSERVED"]);
const ID=/^PAY54-SEC-[1-9][0-9]{3,9}$/;
export function consolidatePay54PublicExposureReview({
 incidentId,observations
}={}){
 if(!ID.test(incidentId??"")||!Array.isArray(observations) ||
    !observations.length||observations.length>100)deny();
 const seen=new Set();
 for(const x of observations){
  if(!x||typeof x!=="object"||typeof x.path!=="string" ||
     !/^[a-zA-Z0-9_./-]{1,512}$/.test(x.path) ||
     x.path.startsWith("/")||x.path.includes("..") ||
     seen.has(x.path)||!STATES.has(x.classification))deny();
  seen.add(x.path);
 }
 const confirmed=observations.filter(x=>x.classification==="CONFIRMED_EXPOSURE").length;
 const potential=observations.filter(x=>x.classification==="POTENTIAL_EXPOSURE").length;
 return Object.freeze({
  schema:"pay54.pages-exposure-review-inventory.v1",
  incidentId,reviewedPathCount:observations.length,
  reportedConfirmedCount:confirmed,
  reportedPotentialCount:potential,
  reviewerClaimsIndependentlyValidated:false,
  containmentProven:false,
  productionReleaseAuthorised:false
 });
}
