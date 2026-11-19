"use strict";

/**
 * PAY54 item 605 — static linked-card public release dependency audit.
 *
 * Identifies why the public site cannot package the current development
 * provider. Does not rewrite script tags or change funding behaviour.
 */
import {readFileSync} from "node:fs";
import {resolve,join} from "node:path";
import {fileURLToPath} from "node:url";
import {inspectPay54StaticSiteCandidate}
 from "./pay54-static-site-candidate-inventory.mjs";
import {auditPay54StaticSiteLinks}
 from "./pay54-static-site-link-audit.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const PROVIDER="assets/js/infrastructure/payments/providers/linked-card-development.js";
const ADAPTER="assets/js/engine/funding/adapters/linked-card.js";
const SERVICE="assets/js/services/funding.js";
function scriptPosition(html,path){
 const pattern=new RegExp("<script\\s+[^>]*\\bsrc=[\"']"+
  path.replaceAll(".","\\.")+"(?:\\?[^\"']*)?[\"'][^>]*>","i");
 const match=pattern.exec(html);
 return match?match.index:-1;
}
export function auditPay54LinkedCardReleaseDependency(sourceRoot=ROOT){
 const root=resolve(sourceRoot);
 const inventory=inspectPay54StaticSiteCandidate(root);
 const html=readFileSync(join(root,"dashboard.html"),"utf8");
 const links=auditPay54StaticSiteLinks(root);
 const positions=Object.freeze({
  developmentProvider:scriptPosition(html,PROVIDER),
  linkedCardAdapter:scriptPosition(html,ADAPTER),
  fundingService:scriptPosition(html,SERVICE)
 });
 const issues=[];
 if(positions.developmentProvider>=0)
  issues.push("DEVELOPMENT_CARD_PROVIDER_REFERENCED");
 if(!inventory.candidatePaths.includes(PROVIDER)&&
  positions.developmentProvider>=0)
  issues.push("PROVIDER_EXCLUDED_BY_PUBLICATION_POLICY");
 if(positions.linkedCardAdapter>=0&&positions.developmentProvider<0)
  issues.push("LINKED_CARD_ADAPTER_HAS_NO_PUBLIC_PROVIDER");
 if(positions.developmentProvider>=0&&positions.linkedCardAdapter>=0&&
  positions.developmentProvider>=positions.linkedCardAdapter)
  issues.push("FUNDING_PROVIDER_LOAD_ORDER_INVALID");
 if(links.missingLocalReferences.some(x=>x.resolved===PROVIDER))
  issues.push("HTML_DEPENDENCY_MISSING_FROM_SAFE_CANDIDATE");
 return Object.freeze({
  schema:"pay54.linked-card-publication-dependency.v1",
  providerPath:PROVIDER,
  linkedCardAdapterPath:ADAPTER,
  servicePath:SERVICE,
  issues:Object.freeze([...new Set(issues)]),
  productionProviderContractVerified:false,
  cardFundingAvailableOnPublicSite:false,
  publicReleaseDependencySatisfied:issues.length===0&&
   positions.linkedCardAdapter<0,
  currentCustomerFunctionalityChanged:false,
  productionRelease:"BLOCKED"
 });
}
