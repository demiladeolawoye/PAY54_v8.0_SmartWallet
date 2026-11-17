"use strict";

/**
 * PAY54 Batch 25 / 977 — public-build linked-card development provider gate.
 *
 * Read-only source analysis of dashboard script wiring. Does not remove
 * working development functionality. Any browser-loadable provider simulator
 * must block financial production publication until a licensed, tested
 * alternative is independently accepted.
 */
import { readFileSync } from "node:fs";

const DEVELOPMENT_PATH=
 "assets/js/infrastructure/payments/providers/linked-card-development.js";
const deny=()=>{throw new Error("PAY54_DEVELOPMENT_PROVIDER_PUBLICATION_DENIED");};

export function inspectPay54DashboardProviderWiring({html}={}){
 if(typeof html!=="string" || !html.trim() || html.length>5_000_000)deny();
 const scripts=[];
 const pattern=/<script\b[^>]*\bsrc\s*=\s*(["'])([^"'<>]+)\1[^>]*>/gi;
 for(const match of html.matchAll(pattern)){
  const raw=match[2].trim();
  if(!raw || raw.length>4096)deny();
  let path;
  try{
   const parsed=new URL(raw,"https://pay54.invalid/");
   path=decodeURIComponent(parsed.pathname.replace(/^\//,""));
  }catch{deny();}
  scripts.push(path);
 }
 const linked=scripts.filter(path=>
  path===DEVELOPMENT_PATH ||
  path.endsWith("/"+DEVELOPMENT_PATH));
 const adapter=scripts.some(path=>
  path==="assets/js/engine/funding/adapters/linked-card.js");
 const funding=scripts.some(path=>
  path==="assets/js/services/funding.js");
 return Object.freeze({
  schema:"pay54.development-card-provider-source-audit.v1",
  scriptTagCount:scripts.length,
  developmentProviderScriptPresent:linked.length>0,
  linkedCardFundingAdapterPresent:adapter,
  fundingServicePresent:funding,
  developmentProviderDoesNotMoveRealFundsVerified:false,
  currentLivePublicationInspected:false,
  productionCardFundingApproved:false,
  productionWebPublicationAllowed:linked.length===0,
  browserFinancialCapabilityEnabledByThisAudit:false
 });
}

export function inspectPay54CheckoutDashboardSource({
 html=readFileSync(new URL("../../dashboard.html",import.meta.url),"utf8")
}={}){
 return inspectPay54DashboardProviderWiring({html});
}
