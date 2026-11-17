"use strict";

/**
 * PAY54 Batch 25 / 981 — cross-office operational blocker reconciliation.
 *
 * Reuses existing PAY54 gate and source scanners. This is an immutable,
 * machine-readable CTO register, not a release authorisation engine.
 */
import {evaluateCheckout} from "./staging-release-gate.mjs";
import {assessPay54TrackedRepositoryRoot}
 from "./pay54-batch25-publication-risk.mjs";
import {inspectPay54CheckoutDashboardSource}
 from "./pay54-batch25-card-provider-publication.mjs";
import {assessPay54TrackedReleaseWorkflowSources}
 from "./pay54-batch25-workflow-inventory.mjs";

const deny=()=>{throw new Error("PAY54_BATCH25_BLOCKER_REVIEW_DENIED");};
const entry=(id,priority,title,unverified)=>Object.freeze({
 id,priority,title,unverified,operationallyClosed:false
});

export function reconcilePay54OperationalBlockers({
 stagingGate,rootRisk,cardWiring,releaseWorkflowRisk
}={}){
 if(!stagingGate || !rootRisk || !cardWiring || !releaseWorkflowRisk ||
    stagingGate.release!=="BLOCKED" ||
    stagingGate.deploymentAuthorized!==false ||
    stagingGate.provisioningAuthorized!==false ||
    stagingGate.financialExecutionAuthorized!==false ||
    typeof rootRisk.sourceRootPublicationBlocked!=="boolean" ||
    typeof cardWiring.developmentProviderScriptPresent!=="boolean" ||
    typeof releaseWorkflowRisk.pagesSettingsVerified!=="boolean")deny();

 const blockers=Object.freeze([
  entry("CR-PAGES-01","P0",
   "Verify active Pages and contain unsafe source-root publication",
   rootRisk.sourceRootPublicationBlocked ||
   !rootRisk.activePagesSourceVerified ||
   !rootRisk.remotePublishedArtifactInspected),
  entry("CR-CARD-01","P0",
   "Replace or explicitly quarantine development linked-card provider",
   cardWiring.developmentProviderScriptPresent ||
   !cardWiring.productionCardFundingApproved),
  entry("CR-DEPLOY-01","P0",
   "Verify protected deployer, OIDC, branch and release environment",
   !releaseWorkflowRisk.pagesSettingsVerified ||
   !releaseWorkflowRisk.deployerCloudIamVerified),
  entry("CR-IDENTITY-01","P0",
   "Contract and provision trusted identity, login, MFA and recovery",true),
  entry("CR-DB-01","P0",
   "Provision staged PostgreSQL, verified RLS and rollback",true),
  entry("CR-RATE-01","P0",
   "Provision distributed atomic login rate limiter",true),
  entry("CR-FINTECH-01","P0",
   "Contract regulated UK–Nigeria funds and safeguarding",true),
  entry("CR-QA-01","P1",
   "Complete authenticated device, tenant and accessibility QA",true)
 ]);
 return Object.freeze({
  schema:"pay54.batch25-cto-operational-blocker-register.v1",
  sourceFindings: Object.freeze({
   sourceRootPublicationBlocked:rootRisk.sourceRootPublicationBlocked,
   linkedCardDevelopmentScriptPresent:
    cardWiring.developmentProviderScriptPresent,
   githubWorkflowCount:releaseWorkflowRisk.workflowCount
  }),
  blockerCount:blockers.length,
  blockers,
  stagingIntegrityChecksOnly:stagingGate.integrityPassed===true,
  independentEvidenceRecordedByThisModule:false,
  stagingReleaseAuthorised:false,
  productionReleaseAuthorised:false
 });
}
export function assessPay54OperationalBlockersInCheckout(){
 return reconcilePay54OperationalBlockers({
  stagingGate:evaluateCheckout(),
  rootRisk:assessPay54TrackedRepositoryRoot(),
  cardWiring:inspectPay54CheckoutDashboardSource(),
  releaseWorkflowRisk:assessPay54TrackedReleaseWorkflowSources()
 });
}
