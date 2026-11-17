"use strict";

/**
 * PAY54 Batch 25 / 987 — deterministic founder remediation report.
 * Renders only predefined blocker IDs and states. Does not quote or publish
 * source file contents, credentials, customer data or network responses.
 */
import {assessPay54OperationalBlockersInCheckout}
 from "./pay54-batch25-operational-blockers.mjs";

const SHA=/^[0-9a-f]{40}$/;
const SAFE=/^[a-zA-Z0-9 ().,/_—–:-]{1,180}$/;
const deny=()=>{throw new Error("PAY54_FOUNDER_REMEDIATION_REPORT_DENIED");};

export function renderPay54FounderRemediationReport({
 sourceSha,operationalReport
}={}){
 if(!SHA.test(sourceSha??"") ||
    operationalReport?.schema!=="pay54.batch25-cto-operational-blocker-register.v1" ||
    operationalReport.productionReleaseAuthorised!==false ||
    !Array.isArray(operationalReport.blockers) ||
    operationalReport.blockers.length!==8)deny();
 const lines=[
  "# PAY54 CTO — Security and Production Remediation",
  "",
  `**Source commit:** \`${sourceSha}\``,
  "",
  "| CR | Priority | Required remediation | Status |",
  "| --- | --- | --- | --- |"
 ];
 for(const blocker of operationalReport.blockers){
  if(!/^CR-[A-Z]+-[0-9]{2}$/.test(blocker.id) ||
     !["P0","P1"].includes(blocker.priority) ||
     !SAFE.test(blocker.title) ||
     blocker.operationallyClosed!==false)deny();
  lines.push(`| ${blocker.id} | ${blocker.priority} | ${blocker.title} | OPEN | `);
 }
 lines.push("","**Production decision: NO-GO.**",
  "Source checks and synthetic CI do not verify live GitHub Pages,",
  "contracted banking infrastructure, staged IAM, identity or payment providers.");
 return lines.join("\n")+"\n";
}

export function renderPay54CurrentFounderReview({sourceSha}={}){
 return renderPay54FounderRemediationReport({
  sourceSha,operationalReport:assessPay54OperationalBlockersInCheckout()
 });
}
