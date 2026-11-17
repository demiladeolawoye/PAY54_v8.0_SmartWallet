"use strict";
/** Batch26/1029 — DNS and Pages certificate evidence is observational only. */
const HOST=new Set(["getpay54.com","www.getpay54.com"]);
const TARGET=new Set(["demiladeolawoye.github.io","getpay54.com"]);
const deny=()=>{throw Error("PAY54_PAGES_DOMAIN_BINDING_DENIED");};
export function assessPay54PagesDomainBinding({hostname,
 reportedCname,httpsCertificateValid,recordObservedAtMs}={}){
 if(!HOST.has(hostname) || typeof reportedCname!=="string" ||
    !TARGET.has(reportedCname.toLowerCase()) ||
    typeof httpsCertificateValid!=="boolean" ||
    !Number.isSafeInteger(recordObservedAtMs)||recordObservedAtMs<=0)deny();
 return Object.freeze({
  schema:"pay54.pages-domain-evidence-v1",
  hostname,reportedCname:reportedCname.toLowerCase(),
  claimedCertificateValid:httpsCertificateValid,
  observedAtMs:recordObservedAtMs,
  dnsIndependentlyVerified:false,
  customDomainActuallyActiveVerified:false,
  publicArtifactProvenanceVerified:false,
  productionReleaseAuthorised:false
 });
}
