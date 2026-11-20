"use strict";

/**
 * PAY54 Batch 28 / 1202 — public-entrypoint financial trust-claim audit.
 *
 * This does not remove existing demo functionality. It prevents a launch
 * candidate from presenting unverified security, KYC, card or wallet claims
 * as verified financial services. The old source may remain for local QA.
 */
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
const deny=()=>{throw Error("PAY54_PUBLIC_ENTRYPOINT_TRUST_AUDIT_DENIED");};
const FLAGS=Object.freeze([
 ["unverified-compliance-claim",/Security\s*&(?:amp;)?\s*Financial\s+compliance\s+active/i],
 ["unverified-kyc-claim",/KYC:\s*<\/strong>\s*Level\s*[1-9]/i],
 ["client-session-guard",/PAY54Session\.isAuthenticated\s*\(/],
 ["development-card-provider",/linked-card-development\.js/i],
 ["sample-wallet-account",/Demo\s+Acct\s*:/i]
]);
export function assessPay54PublicEntrypointTrust({html}={}){
 if(typeof html!=="string"||!html.trim()||
    html.length>3*1024*1024)deny();
 const flags=FLAGS.filter(([,pattern])=>pattern.test(html)).map(([name])=>name);
 const disclaimers=/not\s+live\s+banking|development\s+preview/i.test(html) &&
  /no\s+funds|no\s+regulated\s+financial\s+services/i.test(html);
 return Object.freeze({
  schema:"pay54.public-entrypoint-trust-boundary.v1",
  directTrustMisrepresentationFlags:Object.freeze(flags),
  explicitlyNonfinancialDisclosed:disclaimers,
  allowedAsCustomerBankingEntrypoint:false,
  standaloneMarketingCandidateReviewable:
   disclaimers&&flags.length===0,
  realPagesDeploymentIndependentlyInspected:false,
  financialExecutionAuthorised:false,
  releaseAuthorised:false
 });
}
export function assessPay54CheckoutEntrypoints({
 cwd=resolve(import.meta.dirname,"../..")
}={}){
 if(typeof cwd!=="string")deny();
 let root,dashboard,preview;
 try{
  root=readFileSync(resolve(cwd,"index.html"),"utf8");
  dashboard=readFileSync(resolve(cwd,"dashboard.html"),"utf8");
  preview=readFileSync(resolve(cwd,"public-preview/index.html"),"utf8");
 }catch{deny();}
 return Object.freeze({
  root:assessPay54PublicEntrypointTrust({html:root}),
  dashboard:assessPay54PublicEntrypointTrust({html:dashboard}),
  isolatedPreview:assessPay54PublicEntrypointTrust({html:preview}),
  actualLiveWebsiteNotVerified:true,
  currentFinancialReleaseBlocked:true
 });
}
