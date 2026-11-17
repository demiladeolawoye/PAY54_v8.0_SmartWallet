"use strict";

/**
 * PAY54 Batch 25 / 1003 — offline Pages candidate source-to-build gate.
 *
 * Explicitly rejects using repository root, a sensitive candidate directory,
 * or a dashboard wired to the development payment provider. This does not
 * publish to GitHub Pages, prove the remote artifact or grant deploy rights.
 */
import {verifyPay54StaticReleaseDirectory}
 from "./pay54-batch25-static-release-verify.mjs";
import {assessPay54TrackedRepositoryRoot}
 from "./pay54-batch25-publication-risk.mjs";
import {inspectPay54CheckoutDashboardSource}
 from "./pay54-batch25-card-provider-publication.mjs";

const deny=()=>{throw new Error("PAY54_PAGES_RELEASE_CANDIDATE_DENIED");};

export function reviewPay54OfflinePagesCandidate({
 artifactDirectory,
 inspectArtifact=verifyPay54StaticReleaseDirectory,
 inspectRoot=assessPay54TrackedRepositoryRoot,
 inspectFunding=inspectPay54CheckoutDashboardSource
}={}){
 if(typeof artifactDirectory!=="string" ||
    typeof inspectArtifact!=="function" ||
    typeof inspectRoot!=="function" ||
    typeof inspectFunding!=="function")deny();

 let bundle,root,card;
 try{
  root=inspectRoot();
  card=inspectFunding();
  bundle=inspectArtifact({directory:artifactDirectory});
 }catch{deny();}

 if(root?.sourceRootPublicationBlocked!==true ||
    bundle?.candidateDirectoryApprovedForIndependentReview!==true ||
    bundle?.deploymentAuthorised!==false ||
    bundle?.remoteArtifactInspected!==false ||
    card?.productionCardFundingApproved!==false ||
    typeof card?.developmentProviderScriptPresent!=="boolean")deny();

 const devProvider=card.developmentProviderScriptPresent;
 return Object.freeze({
  schema:"pay54.offline-pages-promotion-boundary.v1",
  isolatedStaticArtifactFileCount:bundle.fileCount,
  repositoryRootExplicitlyRejected:true,
  developmentProviderPresentInCurrentDashboard:devProvider,
  candidateRejectedDueToCardDependency:devProvider,
  readyForIndependentNonFinancialPagesReview:!devProvider,
  currentPagesArtifactAndSettingsVerified:false,
  sensitiveHistoryContainmentVerified:false,
  realMoneyEnabled:false,
  deploymentAuthorised:false
 });
}
