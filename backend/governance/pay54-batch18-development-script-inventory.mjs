"use strict";

/**
 * PAY54 Batch18 item 637 — development-runtime script disclosure audit.
 * This source inventory cannot prove that an arbitrary script is malicious;
 * it requires explicit review of known sensitive preview-only boundaries.
 */
import {readFileSync} from "node:fs";
import {join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {inspectPay54StaticSiteCandidate}
 from "./pay54-static-site-candidate-inventory.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const SCRIPT=/<script\b[^>]*\bsrc\s*=\s*(["'])([^"'<>\r\n]+)\1[^>]*>/gi;
const PREVIEW_ONLY=/(?:^|\/)(?:development-auth-bridge|linked-card-development|preview-execution-gate|preview-claims-guard|dashboard-feed-preview)\.js$/i;
const BLOCKED_RUNTIME=/(?:^|\/)(?:linked-card-development)\.js$/i;

export function inventoryPay54BrowserDevelopmentScripts(root=ROOT){
 const source=resolve(root);
 const pages=inspectPay54StaticSiteCandidate(source)
  .candidatePaths.filter(path=>path.endsWith(".html"));
 const matches=[];
 for(const page of pages){
  const html=readFileSync(join(source,page),"utf8");
  for(const script of html.matchAll(SCRIPT)){
   const target=script[2].split(/[?#]/,1)[0];
   if(!PREVIEW_ONLY.test(target))continue;
   matches.push(Object.freeze({
    page,target,
    releaseClassification:BLOCKED_RUNTIME.test(target)?
     "DEVELOPMENT_PROVIDER_FORBIDDEN_IN_PUBLIC_RELEASE":
     "DEVELOPMENT_PREVIEW_ONLY_REQUIRES_SECURITY_REVIEW"
   }));
  }
 }
 return Object.freeze({
  schema:"pay54.browser-development-runtime-inventory.v1",
  matches:Object.freeze(matches),
  liveCustomerReleaseReady:matches.length===0,
  previewOnlySecurityReviewRequired:matches.length>0,
  currentLiveSourceVerified:false,
  activeDeployedScriptInspected:false,
  productionRelease:"BLOCKED"
 });
}
