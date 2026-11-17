"use strict";

/**
 * PAY54 Batch 24 / 920 — strictly bounded staging-only identity ingress.
 * This parser accepts only a signed access assertion as an untrusted input.
 * It is not an authentication success or a route registration.
 */
const TOKEN=/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const deny=()=>{throw new Error("PAY54_IDENTITY_INGRESS_DENIED");};
export function parsePay54SessionIssuanceRequest({
  requestPayload,requestOrigin,trustedApplicationOrigin
}={}){
  if(!requestPayload || typeof requestPayload!=="object" ||
     Array.isArray(requestPayload) ||
     Object.getPrototypeOf(requestPayload)!==Object.prototype ||
     Object.keys(requestPayload).length!==1 ||
     !Object.hasOwn(requestPayload,"accessAssertion") ||
     typeof requestPayload.accessAssertion!=="string" ||
     requestPayload.accessAssertion.length<100 ||
     requestPayload.accessAssertion.length>8192 ||
     !TOKEN.test(requestPayload.accessAssertion))deny();

  if(typeof trustedApplicationOrigin!=="string" ||
     requestOrigin!==trustedApplicationOrigin)deny();
  let url;
  try{url=new URL(trustedApplicationOrigin);}catch{deny();}
  if(url.protocol!=="https:" ||
     url.origin!==trustedApplicationOrigin ||
     url.username || url.password || url.search || url.hash)deny();

  return Object.freeze({
    schema:"pay54.identity-ingress.v1",
    accessAssertion:requestPayload.accessAssertion,
    identitySignatureVerificationRequired:true,
    replayConsumptionRequired:true,
    sessionIssued:false
  });
}
