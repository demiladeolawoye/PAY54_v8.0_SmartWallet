"use strict";

/**
 * PAY54 Batch 24 / 946 — distributed login-attempt admission contract.
 *
 * Requires a real trusted, cross-instance atomic limiter. This module does
 * not pretend an in-memory Map protects a global fintech deployment.
 * Fingerprints must be HMACs from trusted ingress, never a raw IP/PII or
 * a browser-request field. No HTTP route or automatic retry is enabled.
 */
const HEX=/^[0-9a-f]{64}$/;
const deny=()=>{throw new Error("PAY54_BOOTSTRAP_RATE_LIMIT_UNAVAILABLE");};
export function createPay54BootstrapRateGuard({consumeAtomicAttempt}={}){
 if(typeof consumeAtomicAttempt!=="function")deny();
 return Object.freeze({
  async admit({trustedRequestHmac,correlationId}={}){
   if(typeof trustedRequestHmac!=="string" || !HEX.test(trustedRequestHmac) ||
      typeof correlationId!=="string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
       .test(correlationId))deny();
   let result;
   try{
    result=await consumeAtomicAttempt(Object.freeze({
     key:trustedRequestHmac,operation:"identity-bootstrap",
     windowSeconds:60,maxAttempts:5,
     correlationId
    }));
   }catch{deny();}
   if(result?.enforcedBy!=="distributed-atomic-store" ||
      result.allowed!==true ||
      !Number.isInteger(result.remaining) || result.remaining<0 ||
      result.remaining>4)deny();
   return Object.freeze({
    schema:"pay54.identity-bootstrap-rate-admission.v1",
    attemptAllowed:true,
    serviceProviderNotProvisionedHere:true,
    customerIdentityVerified:false,
    accountSessionCreated:false
   });
  }
 });
}
