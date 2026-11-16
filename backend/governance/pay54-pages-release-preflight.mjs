"use strict";

/**
 * PAY54 item 602 — local release preflight, never a release authorisation.
 * Combines site candidate and static dependencies using the existing canonical
 * scanners. Never reads GitHub Pages settings or contacts a network.
 */
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
import {inspectPay54StaticSiteCandidate}
 from "./pay54-static-site-candidate-inventory.mjs";
import {inspectPay54PublicationReadiness}
 from "./pay54-publication-source-readiness.mjs";
import {assessPay54PublicSiteManifest}
 from "./pay54-public-site-manifest.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const SENSITIVE=/\b(?:secret|token|password|credential|private-key|id_rsa)\b/i;
const safePath=s=>typeof s==="string"&&s.length<240&&!SENSITIVE.test(s);
export function assessPay54PagesReleasePreflight(root=ROOT){
 const inventory=inspectPay54StaticSiteCandidate(resolve(root));
 const ready=inspectPay54PublicationReadiness(resolve(root));
 const manifest=assessPay54PublicSiteManifest({paths:inventory.candidatePaths});
 const missing=ready.issues.filter(x=>x.category==="HTML_MISSING"||
  x.category==="CSS_MISSING").map(x=>Object.freeze({
   source:safePath(x.page)?x.page:"REDACTED_SOURCE",
   dependency:safePath(x.resolved)?x.resolved:"REDACTED_DEPENDENCY",
   category:x.category
  }));
 const unresolvedInfrastructure=missing.filter(x=>
  /(?:^|\/)infrastructure(?:\/|$)/i.test(x.dependency));
 const blockers=[];
 if(!manifest.sourceManifestStructurallySafe)blockers.push("SITE_MANIFEST_DENIED");
 if(ready.sourceDependencyStatus!=="PASS")blockers.push("SITE_DEPENDENCY_GRAPH_INCOMPLETE");
 if(unresolvedInfrastructure.length)blockers.push("DEVELOPMENT_PROVIDER_IN_FORBIDDEN_PUBLICATION_PATH");
 if(ready.thirdPartyScriptReviewStatus!=="NO_SOURCE_FINDINGS")
  blockers.push("EXTERNAL_SCRIPT_MANUAL_REVIEW_REQUIRED");
 return Object.freeze({
  schema:"pay54.pages-release-preflight.v1",
  candidateCount:inventory.candidateCount,
  excludedCount:inventory.excludedSourcePaths.length,
  unresolvedDependencies:Object.freeze(missing),
  blockers:Object.freeze(blockers),
  sourceReviewPassed:blockers.length===0,
  livePagesConfigVerified:false,
  activeDeploymentArtifactVerified:false,
  customerDataUsed:false,
  settingsChanged:false,
  deployed:false,
  releaseAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const review=assessPay54PagesReleasePreflight();
  process.stdout.write(JSON.stringify(review,null,2)+"\n");
  // This CLI is a strict preflight; a failing source candidate returns nonzero.
  if(!review.sourceReviewPassed)process.exitCode=2;
 }catch{
  process.stderr.write("PAY54_PAGES_RELEASE_PREFLIGHT_FAILED\n");
  process.exitCode=2;
 }
}
