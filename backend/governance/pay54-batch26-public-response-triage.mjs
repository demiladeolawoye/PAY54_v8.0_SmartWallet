"use strict";
/** Batch26/1022 — HTTP HEAD is a triage signal, never exposure proof. */
const PRIVATE=new Set([
 "backend/src/server.mjs",
 "backend/db/migrations/020_initial_account_binding.sql",
 "infrastructure/staging/main.tf",
 "docs/engineering/pay54-batch25-founder-register.md",
 ".github/workflows/pay54-staging-deploy.yml"
]);
const deny=()=>{throw new Error("PAY54_PUBLIC_RESPONSE_TRIAGE_DENIED");};
export function triagePay54PublicResponse({requestPath,statusCode,contentType,redirectLocation=null}={}){
 if(!PRIVATE.has(requestPath) ||
    !Number.isInteger(statusCode) ||statusCode<100||statusCode>599 ||
    typeof contentType!=="string"||contentType.length>128 ||
    (redirectLocation!==null && typeof redirectLocation!=="string"))deny();
 const isRedirect=statusCode>=300&&statusCode<400;
 const commonHtml=/^text\/html(?:;|$)/i.test(contentType);
 const eligible=statusCode>=200&&statusCode<300 && !commonHtml;
 return Object.freeze({
  schema:"pay54.public-source-http-triage.v1",
  requestPath,statusCode,
  responseMayContainSensitiveSource:eligible,
  suspectedSpaFallback:statusCode===200&&commonHtml,
  manualRedirectFollowupRequired:isRedirect,
  finalSourceExposureConfirmed:false,
  completeResponseContentIndependentlyVerified:false,
  releaseAuthorised:false
 });
}
