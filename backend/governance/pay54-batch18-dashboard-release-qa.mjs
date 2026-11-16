"use strict";

/**
 * PAY54 Batch18 item 648 — release-specific dashboard UX evidence gate.
 * Device screenshot and accessibility assertions require the exact release
 * commit. Operator-supplied fields are never independent certification.
 */
const SHA=/^[a-f0-9]{40}$/;
const VIEWPORTS=Object.freeze(["desktop","tablet","mobile"]);
export function reviewPay54DashboardReleaseQA(packet={}){
 if(!packet||typeof packet!=="object"||Array.isArray(packet)){
  throw new TypeError("PAY54_DASHBOARD_QA_PACKET_REQUIRED");
 }
 const findings=[];
 if(!SHA.test(packet.releaseCommitSha??"")||
  !SHA.test(packet.screenshotSourceSha??"")||
  packet.releaseCommitSha!==packet.screenshotSourceSha){
  findings.push("RELEASE_AND_SCREENSHOT_SOURCE_SHA_MISMATCH");
 }
 for(const device of VIEWPORTS){
  if(packet.viewportChecks?.[device]!==true){
   findings.push("MISSING_VISUAL_QA_"+device.toUpperCase());
  }
 }
 for(const [name,required] of [
  ["balanceDetailsVisible",true],
  ["tabletMoneyMovesNoOverlap",true],
  ["anonymousLoginBoundaryPassed",true],
  ["syntheticPreviewNeverRunsFinance",true],
  ["keyboardFocusOrderReviewed",true],
  ["screenReaderDisclosureReviewed",true],
  ["mobileOverflowChecked",true]
 ]){
  if(packet[name]!==required){
   findings.push("QA_CONTROL_NOT_EVIDENCED_"+name.toUpperCase());
  }
 }
 return Object.freeze({
  schema:"pay54.dashboard-release-qa-evidence.v1",
  reviewPacketComplete:findings.length===0,
  missingEvidence:Object.freeze(findings),
  independentBrowserEvidenceValidated:false,
  authenticatedMoneyFlowsValidated:false,
  liveSiteTested:false,
  customerReleaseApproved:false,
  productionRelease:"BLOCKED"
 });
}
