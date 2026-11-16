"use strict";

import {assessPay54SourceRevisionEvidence} from "./pay54-source-revision-evidence.mjs";
import {assessPay54PublicationBoundary} from "./pay54-publication-boundary-audit.mjs";
import {assessPay54PublicSiteManifest} from "./pay54-public-site-manifest.mjs";

/*
 * PAY54 Batch 11 item 281 — source-only evidence reconciliation.
 * Passing CI is a necessary source check but never equivalent to cloud
 * attestation, independent review or authority to publish or deploy.
 * Missing/contradictory input fails closed. No I/O or side effects.
 */
export function reconcilePay54PublicationReleaseEvidence({
  revisionEvidence,publicationEvidence,proposedSitePaths
}={}){
  if(!revisionEvidence || !publicationEvidence ||
      !Array.isArray(proposedSitePaths)){
    throw new Error("PAY54_RELEASE_RECONCILIATION_INVALID");
  }
  const revision=assessPay54SourceRevisionEvidence(revisionEvidence);
  const publication=assessPay54PublicationBoundary(publicationEvidence);
  const manifest=assessPay54PublicSiteManifest({paths:proposedSitePaths});
  if(revision.expectedSha!==publication.sourceRevision){
    throw new Error("PAY54_RELEASE_REVISION_MISMATCH");
  }
  const unresolved=Object.freeze([
    ...(revision.sourceRegressionComplete?[]:["SOURCE_REGRESSION_INCOMPLETE"]),
    ...(manifest.sourceManifestStructurallySafe?[]:["PUBLIC_MANIFEST_UNSAFE"]),
    ...(publication.pagesWorkflowSucceeded?["PAGES_AUTO_PUBLICATION_OBSERVED"]:[]),
    "PAGES_SETTINGS_UNVERIFIED",
    "PUBLIC_ARTEFACTS_UNVERIFIED",
    "PROTECTED_ENVIRONMENT_UNVERIFIED",
    "INDEPENDENT_APPROVAL_MISSING",
    "LIVE_CREDENTIAL_AND_AUDIT_UNVERIFIED"
  ]);
  return Object.freeze({
    assessedRevision:revision.expectedSha,
    sourceRegressionComplete:revision.sourceRegressionComplete,
    proposedSiteManifestSafe:manifest.sourceManifestStructurallySafe,
    pagesSuccessObserved:publication.pagesWorkflowSucceeded,
    unresolved,
    independentlyVerified:false,
    authorizedForPublication:false,
    authorizedForDeployment:false,
    customerDataAccessEnabled:false,
    financialExecutionEnabled:false,
    cloudProvisioningEnabled:false,
    stagingRelease:"BLOCKED",
    productionRelease:"BLOCKED"
  });
}
