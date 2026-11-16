"use strict";

/**
 * PAY54 item 474 — offline source-to-staged-publication attestation.
 *
 * Combines independent source content fingerprints, published-candidate byte
 * comparison and a deny-by-default publication tree policy. No GitHub API,
 * deployment network call, release approval or real-money access occurs.
 */
import {hashPay54StaticSiteCandidate}
 from "./pay54-static-site-content-integrity.mjs";
import {verifyPay54StagedSite}
 from "./pay54-static-site-stage-verifier.mjs";
import {inspectPay54PublicationTree}
 from "./pay54-publication-tree-inspector.mjs";

export function inspectPay54CandidatePublicationAttestation({
 sourceRoot,stagedSiteRoot
}={}){
 if(typeof sourceRoot!=="string"||!sourceRoot.trim()||
  typeof stagedSiteRoot!=="string"||!stagedSiteRoot.trim()){
  throw new TypeError("PAY54_PUBLICATION_ATTESTATION_ROOTS_REQUIRED");
 }
 const source=hashPay54StaticSiteCandidate(sourceRoot);
 const stage=verifyPay54StagedSite(sourceRoot,stagedSiteRoot);
 const tree=inspectPay54PublicationTree(stagedSiteRoot);
 const digestMatches=source.manifestSha256===stage.manifestSha256&&
  source.manifestSha256===tree.manifestSha256;
 const sourceComplete=stage.verified&&tree.sourcePolicyPassed&&
  source.candidateCount===tree.fileCount&&digestMatches;
 const blockers=[];
 if(!stage.verified)blockers.push("STAGE_CONTENT_NOT_IDENTICAL");
 if(!tree.sourcePolicyPassed)blockers.push("UNSAFE_PUBLICATION_TREE");
 if(!digestMatches)blockers.push("MANIFEST_DIGEST_MISMATCH");
 if(source.candidateCount!==tree.fileCount)blockers.push("CANDIDATE_COUNT_MISMATCH");
 return Object.freeze({
  schema:"pay54.local-publication-attestation.v1",
  candidateCount:source.candidateCount,
  sourceManifestSha256:source.manifestSha256,
  stagedManifestSha256:tree.manifestSha256,
  sourceToStageMatches:sourceComplete,
  blockers:Object.freeze(blockers),
  actualGitHubPagesArtifactInspected:false,
  livePagesSettingsVerified:false,
  independentSecurityAcceptance:false,
  releaseAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
