"use strict";

/**
 * PAY54 Batch 14 item 418 — deterministic release evidence completeness review.
 *
 * Independent owner evidence is required for every operational release gate.
 * This module NEVER authenticates evidence, approves a deployment, or enables
 * real-money transactions. It is safe to run with local test-only records.
 */

const GATES=Object.freeze([
 "PAGES_SOURCE",
 "PAGES_ARTIFACT",
 "PUBLIC_REACHABILITY",
 "RUNTIME_ASSET_GRAPH",
 "SECRETS_AND_CDN",
 "BRANCH_AND_DEPLOYER",
 "CUSTOMER_JOURNEYS",
 "ROLLBACK_REHEARSAL",
 "FOUNDER_SECURITY_RELEASE_APPROVAL"
]);
const COMMIT=/^[0-9a-f]{40}$/;
const EVIDENCE_ID=/^PAY54-EV-[A-Z0-9-]{6,64}$/;
const ACTOR=/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/;
const MAX_AGE_MS=7*24*60*60*1000;
const freezeList=list=>Object.freeze(list.map(item=>Object.freeze(item)));
export const PAY54_RELEASE_GATES=GATES;

export function assessPay54ReleaseEvidence(input,{now=new Date()}={}){
 if(!input||typeof input!=="object"||Array.isArray(input)){
  throw new TypeError("PAY54_RELEASE_EVIDENCE_INPUT_REQUIRED");
 }
 const referenceTime=now instanceof Date?now.getTime():Number.NaN;
 if(!Number.isFinite(referenceTime)){
  throw new TypeError("PAY54_RELEASE_EVIDENCE_TIME_INVALID");
 }
 const expectedCommit=typeof input.commitSha==="string"?input.commitSha:"";
 const commitValid=COMMIT.test(expectedCommit);
 const evidence=Array.isArray(input.evidence)&&input.evidence.length<=100
  ?input.evidence:[];
 const exceptions=[];
 const accounted=new Map();
 for(const record of evidence){
  if(!record||typeof record!=="object"||Array.isArray(record)){
   exceptions.push("INVALID_RECORD");continue;
  }
  const gate=record.gate;
  if(!GATES.includes(gate)){
   exceptions.push("UNEXPECTED_GATE");continue;
  }
  if(accounted.has(gate)){
   exceptions.push("DUPLICATE_GATE");continue;
  }
  accounted.set(gate,record);
 }
 const findings=[];
 for(const gate of GATES){
  const item=accounted.get(gate);
  if(!item){
   findings.push({gate,reason:"MISSING_EVIDENCE"});continue;
  }
  if(item.decision!=="PASS"){
   findings.push({gate,reason:"NOT_APPROVED"});continue;
  }
  if(!commitValid||item.commitSha!==expectedCommit){
   findings.push({gate,reason:"COMMIT_MISMATCH"});continue;
  }
  if(!EVIDENCE_ID.test(item.evidenceId??"")){
   findings.push({gate,reason:"EVIDENCE_REFERENCE_INVALID"});continue;
  }
  if(!ACTOR.test(item.owner??"")||!ACTOR.test(item.reviewer??"")||
   item.owner===item.reviewer){
   findings.push({gate,reason:"INDEPENDENT_REVIEW_MISSING"});continue;
  }
  const recordedAt=Date.parse(item.reviewedAt);
  if(typeof item.reviewedAt!=="string"||!Number.isFinite(recordedAt)||
   recordedAt>referenceTime||referenceTime-recordedAt>MAX_AGE_MS){
   findings.push({gate,reason:"STALE_OR_INVALID_EVIDENCE"});continue;
  }
 }
 if(!commitValid)findings.push({gate:"COMMIT",reason:"INVALID_COMMIT"});
 for(const exception of exceptions){
  findings.push({gate:"SCHEMA",reason:exception});
 }
 return Object.freeze({
  schema:"pay54.release-evidence-completeness.v1",
  reviewedCommit:commitValid?expectedCommit:null,
  expectedGateCount:GATES.length,
  providedGateCount:accounted.size,
  findings:freezeList(findings),
  evidenceMetadataComplete:findings.length===0,
  evidenceAuthenticityVerified:false,
  releaseAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
