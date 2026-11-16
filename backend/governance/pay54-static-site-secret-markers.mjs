"use strict";

/**
 * PAY54 implementation 395: offline, bounded static-site secret marker review.
 *
 * Inspects only assets already chosen by the restricted candidate inventory.
 * Findings deliberately omit values, excerpts and line contents. This is a
 * baseline guard, not a comprehensive secret-scan attestation.
 */
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {inspectPay54StaticSiteCandidate}
 from "./pay54-static-site-candidate-inventory.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const TEXT=/\.(?:html|js|mjs|css|svg)$/i;
const RULES=Object.freeze([
 Object.freeze({id:"PRIVATE_KEY_BLOCK",pattern:/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/}),
 Object.freeze({id:"GITHUB_TOKEN",pattern:/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/}),
 Object.freeze({id:"GITHUB_FINE_GRAINED_TOKEN",pattern:/\bgithub_pat_[A-Za-z0-9_]{45,}\b/}),
 Object.freeze({id:"AWS_ACCESS_KEY",pattern:/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/}),
 Object.freeze({id:"SLACK_ACCESS_TOKEN",pattern:/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/})
]);

export function inspectPay54StaticSiteSecrets(sourceRoot=ROOT){
 const inv=inspectPay54StaticSiteCandidate(sourceRoot);
 const findings=[];
 let inspected=0;
 for(const path of inv.candidatePaths){
  if(!TEXT.test(path))continue;
  const bytes=readFileSync(resolve(sourceRoot,path));
  const body=bytes.toString("utf8");
  inspected++;
  for(const rule of RULES){
   if(rule.pattern.test(body)){
    findings.push(Object.freeze({path,ruleId:rule.id}));
   }
  }
 }
 return Object.freeze({
  schema:"pay54.static-source-secret-markers.v1",
  inspectedTextFiles:inspected,
  findingCount:findings.length,
  findings:Object.freeze(findings),
  sourceMarkerReviewPassed:findings.length===0,
  valuesReported:false,
  exhaustiveSecretScan:false,
  realPagesArtifactInspected:false,
  publicationAuthorized:false,
  productionRelease:"BLOCKED"
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const report=inspectPay54StaticSiteSecrets();
  process.stdout.write(JSON.stringify(report,null,2)+"\n");
  if(!report.sourceMarkerReviewPassed)process.exitCode=1;
 }catch{
  process.stderr.write("PAY54_STATIC_SITE_SECRET_REVIEW_FAILED\n");
  process.exitCode=1;
 }
}
