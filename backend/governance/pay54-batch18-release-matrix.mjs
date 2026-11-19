"use strict";

/**
 * PAY54 Batch 18 item 627 — merged release-safety matrix.
 * Never elevates owner-supplied evidence or synthetic CI into live authority.
 */
import {fileURLToPath} from "node:url";
import {assessPay54Batch17DeploymentReadiness}
 from "./pay54-batch17-deployment-readiness.mjs";
import {reviewPay54PagesOwnerEvidence}
 from "./pay54-batch18-pages-owner-evidence.mjs";
import {assessPay54LinkedCardReleaseOption}
 from "./pay54-batch18-linked-card-release-option.mjs";
import {inspectPay54FirstPartyHtmlDependencies}
 from "./pay54-firstparty-html-dependency-audit.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
export function assessPay54Batch18ReleaseMatrix({
 sourceRoot=ROOT,pagesEvidence={},linkedCardOption={}
}={}){
 const source=assessPay54Batch17DeploymentReadiness(sourceRoot);
 const pages=reviewPay54PagesOwnerEvidence(pagesEvidence);
 const card=assessPay54LinkedCardReleaseOption(linkedCardOption);
 const refs=inspectPay54FirstPartyHtmlDependencies(sourceRoot);
 const blockers=new Set(source.blockingReasons);
 if(!refs.publicDependencyGraphComplete)blockers.add("HTML_DEPENDENCIES_NOT_PUBLICATION_SAFE");
 if(!pages.evidencePacketStructurallyComplete){
  blockers.add("ACTIVE_PAGES_OWNER_EVIDENCE_INCOMPLETE");
 }
 if(!card.evidencePacketComplete){
  blockers.add("LINKED_CARD_RELEASE_CHOICE_INCOMPLETE");
 }
 // Independently observed active deployment, content and permissions
 // require separate operations not available in this source-only audit.
 blockers.add("ACTIVE_PAGES_CONFIGURATION_NOT_VERIFIED_BY_SECURITY");
 blockers.add("LIVE_PUBLIC_EXPOSURE_ASSESSMENT_NOT_COMPLETE");
 blockers.add("PROTECTED_DEPLOYER_AND_ROLLBACK_NOT_VERIFIED");
 return Object.freeze({
  schema:"pay54.batch18-release-matrix.v1",
  categories:Object.freeze({
   restrictedSource:source.candidateSourceReady?"SOURCE_CHECK_PASS":"BLOCKED",
   staticReferences:refs.publicDependencyGraphComplete?"SOURCE_CHECK_PASS":"BLOCKED",
   pagesOwnerPacket:pages.evidencePacketStructurallyComplete?"FORMAT_COMPLETE":"INCOMPLETE",
   linkedCardChoice:card.evidencePacketComplete?"FORMAT_COMPLETE":"INCOMPLETE",
   independentLiveReview:"NOT_VERIFIED",
   providerContract:"NOT_VERIFIED",
   protectedRollout:"NOT_VERIFIED",
   financialLaunch:"BLOCKED"
  }),
  blockingReasons:Object.freeze([...blockers]),
  releaseApproved:false,
  currentPagesChanged:false,
  financialExecutionEnabled:false,
  nextAction:"INDEPENDENT_OWNER_SECURITY_RELEASE_EVIDENCE",
  productionRelease:"BLOCKED"
 });
}
