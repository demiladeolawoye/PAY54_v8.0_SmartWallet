"use strict";

/**
 * PAY54 implementation 375: deterministic, read-only source publication gate.
 * Reports candidate integrity, HTML and CSS dependencies; never packages or
 * publishes a website and never claims live URL reachability.
 */
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {inspectPay54StaticSiteCandidate} from "./pay54-static-site-candidate-inventory.mjs";
import {auditPay54StaticSiteLinks} from "./pay54-static-site-link-audit.mjs";
import {auditPay54CssAssetLinks} from "./pay54-css-asset-link-audit.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
export function inspectPay54PublicationReadiness(sourceRoot=ROOT){
 const inventory=inspectPay54StaticSiteCandidate(sourceRoot);
 const html=auditPay54StaticSiteLinks(sourceRoot);
 const css=auditPay54CssAssetLinks(sourceRoot);
 const digest=createHash("sha256").update(inventory.candidatePaths.join("\n")).digest("hex");
 const issues=Object.freeze([
  ...html.missingLocalReferences.map(x=>({...x,category:"HTML_MISSING"})),
  ...html.rejectedReferences.map(x=>({...x,category:"HTML_UNSAFE"})),
  ...css.missingLocalReferences.map(x=>({...x,category:"CSS_MISSING"})),
  ...css.rejectedReferences.map(x=>({...x,category:"CSS_UNSAFE"}))
 ]);
 const ready=issues.length===0;
 return Object.freeze({
  schema:"pay54.publication-source-review.v1",
  candidateCount:inventory.candidateCount,
  manifestSha256:digest,
  htmlCheckedReferences:html.checkedLocalReferences,
  cssCheckedReferences:css.checkedLocalReferences,
  externalReferenceCount:html.externalReferences.length+css.externalReferences.length,
  issues,
  sourceDependencyStatus:ready?"PASS":"FAIL",
  actualArtifactInspected:false,
  liveUrlReachabilityVerified:false,
  repositoryPagesSettingsVerified:false,
  independentSecretsReviewCompleted:false,
  fullDynamicDependencyGraphVerified:false,
  publicationAuthorized:false,
  productionRelease:"BLOCKED"
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const result=inspectPay54PublicationReadiness();
  process.stdout.write(JSON.stringify(result,null,2)+"\n");
  if(result.sourceDependencyStatus!=="PASS")process.exitCode=1;
 }catch{
  process.stderr.write("PAY54_PUBLICATION_SOURCE_REVIEW_FAILED\n");
  process.exitCode=1;
 }
}
