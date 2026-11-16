"use strict";
import {requireAccountCredentialBinding} from "../security/account-credential-binding.mjs";

/*
 * PAY54 Batch 10 item 244. Static TLS configuration shape gate, test only.
 * Never opens a network connection or claims a certificate was authenticated.
 * Operational TLS trust roots and real endpoint allow-list require separate
 * independent review and explicit staging/production approval.
 */
const HOST=/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const FINGERPRINT=/^[a-f0-9]{64}$/;
export function createAccountEndpointReview({approvedEndpoints}={}){
 if(!Array.isArray(approvedEndpoints) || approvedEndpoints.length===0){
  throw new TypeError("ACCOUNT_ENDPOINT_REVIEW_REQUIRED");
 }
 const entries=new Map();
 for(const entry of approvedEndpoints){
  if(!entry || typeof entry!=="object" || Array.isArray(entry) ||
     typeof entry.endpointId!=="string" ||
     !/^[a-z][a-z0-9-]{2,63}$/.test(entry.endpointId) ||
     !HOST.test(entry.host??"") ||
     entry.tlsServerName!==entry.host ||
     !Number.isSafeInteger(entry.port) || entry.port<1 || entry.port>65535 ||
     !FINGERPRINT.test(entry.caSha256??"") ||
     entry.rejectUnauthorized!==true || entry.tlsRequired!==true ||
     entry.allowInsecureFallback!==false ||
     entries.has(entry.endpointId)){
   throw new TypeError("ACCOUNT_ENDPOINT_REVIEW_INVALID");
  }
  entries.set(entry.endpointId,Object.freeze({
   endpointId:entry.endpointId,host:entry.host,port:entry.port,
   tlsServerName:entry.tlsServerName,caSha256:entry.caSha256
  }));
 }
 return Object.freeze({
  review(binding){
   const issued=requireAccountCredentialBinding(binding);
   if(issued.environment!=="test")throw new Error("ACCOUNT_ENDPOINT_DENIED");
   const item=entries.get(issued.endpointId);
   if(!item)throw new Error("ACCOUNT_ENDPOINT_DENIED");
   return Object.freeze({
    endpointId:item.endpointId,reviewedTlsServerName:item.tlsServerName,
    reviewedCaFingerprint:item.caSha256,reviewedPort:item.port,
    tlsConfigReviewed:true,liveTlsAttested:false,
    customerDataAccessEnabled:false,financialExecutionEnabled:false
   });
  }
 });
}
