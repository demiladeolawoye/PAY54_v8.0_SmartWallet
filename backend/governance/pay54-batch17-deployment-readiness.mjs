"use strict";

/**
 * PAY54 item 611 — Batch 17 deployment readiness facts, not an authoriser.
 *
 * Reuses canonical publication and linked-card audits. Missing or unverified
 * live Pages evidence cannot be promoted to PASS by self-asserted metadata.
 */
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
import {assessPay54PagesReleasePreflight}
 from "./pay54-pages-release-preflight.mjs";
import {auditPay54LinkedCardReleaseDependency}
 from "./pay54-linked-card-publication-dependency.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
export function assessPay54Batch17DeploymentReadiness(sourceRoot=ROOT){
 const root=resolve(sourceRoot);
 const preflight=assessPay54PagesReleasePreflight(root);
 const linkedCard=auditPay54LinkedCardReleaseDependency(root);
 const blocking=new Set(preflight.blockers);
 if(!linkedCard.publicReleaseDependencySatisfied){
  blocking.add("LINKED_CARD_PUBLIC_RELEASE_CONTRACT_UNVERIFIED");
 }
 blocking.add("CURRENT_PAGES_DEPLOYMENT_NOT_INDEPENDENTLY_ATTESTED");
 blocking.add("CURRENT_PUBLIC_EXPOSURE_P0_NOT_CLOSED");
 blocking.add("RESTRICTED_DEPLOYER_AND_ROLLBACK_NOT_APPROVED");
 return Object.freeze({
  schema:"pay54.batch17.deployment-readiness.v1",
  candidateCount:preflight.candidateCount,
  blockedDependencies:preflight.unresolvedDependencies,
  blockingReasons:Object.freeze([...blocking]),
  candidateSourceReady:preflight.sourceReviewPassed,
  linkedCardProviderContractVerified:linkedCard.productionProviderContractVerified,
  currentPagesSettingsVerified:false,
  activeProductionArtifactVerified:false,
  historicPagesP0Resolved:false,
  exactCommitBrowserQaReviewed:false,
  rollbackRehearsalAccepted:false,
  independentFounderSecurityApproval:false,
  newSitePublished:false,
  customerMoneyMovementEnabled:false,
  deploymentPermitted:false,
  productionRelease:"BLOCKED"
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const r=assessPay54Batch17DeploymentReadiness();
  process.stdout.write(JSON.stringify(r,null,2)+"\n");
 }catch{
  process.stderr.write("PAY54_BATCH17_RELEASE_READINESS_FAILED\n");
  process.exitCode=2;
 }
}
