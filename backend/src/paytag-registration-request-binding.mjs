"use strict";

/**
 * PAY54 CR-PAYTAG-01 P2B-B2B1: cryptographic registration request binding.
 *
 * This module creates a short-lived, server-derived request binding for a
 * future trusted PostgreSQL executor. It does not assert database ownership,
 * verify a stored CSRF digest, claim a tag, enable routes, or move money.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import {
  extractPay54BearerCredential,
  digestPay54BearerToken
} from "./postgres-session-resolver.mjs";

const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const DENIED="PAY54_PAYTAG_REGISTRATION_REQUEST_DENIED";
const deny=()=>{throw new Error(DENIED);};
const canonicalOrigin=value=>{
  if(typeof value!=="string") deny();
  let url;
  try{url=new URL(value);}catch{deny();}
  if(url.protocol!=="https:"||url.origin!==value||url.username||
     url.password||url.search||url.hash||url.pathname!=="/") deny();
  return url.origin;
};
function decodeToken(value){
  if(typeof value!=="string"||!TOKEN.test(value)) deny();
  const bytes=Buffer.from(value,"base64url");
  if(bytes.length!==32||bytes.toString("base64url")!==value) deny();
  return bytes;
}
function fixedHex(value){
  if(typeof value!=="string"||!/^[a-f0-9]{64}$/.test(value)) deny();
  return Buffer.from(value,"hex");
}
const sha=value=>createHash("sha256").update(value).digest("hex");
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Server configuration must supply an independently managed 32-byte HMAC
 * secret. Never derive it from HTTP headers, client JSON or a bearer token.
 * Returned digests are stable across same-account retries but unlinkable
 * without the server secret. No raw bearer, CSRF or idempotency key is stored.
 */
export function createPay54PayTagRequestBinding({
  trustedApplicationOrigin,
  idempotencyHmacKey
}={}){
  const origin=canonicalOrigin(trustedApplicationOrigin);
  if(!Buffer.isBuffer(idempotencyHmacKey)||idempotencyHmacKey.length!==32) deny();
  const privateKey=Buffer.from(idempotencyHmacKey);

  return function bindRequest({requestContext,admission}={}){
    if(!admission||typeof admission!=="object"||
       admission.schema!=="pay54.paytag.registration-admission.v1"||
       admission.admissibleForTrustedDatabaseRevalidation!==true||
       admission.registryWriteAuthorised!==false||
       admission.financialExecutionEnabled!==false||
       !uuid.test(admission.accountId??"")||
       !uuid.test(admission.principalId??"")||
       !uuid.test(admission.sessionId??"")||
       !Number.isSafeInteger(admission.sessionVersion)||
       admission.sessionVersion<1||
       typeof admission.canonicalAlias!=="string"||
       !/^[a-z][a-z0-9]*([._-][a-z0-9]+)*$/.test(admission.canonicalAlias)||
       admission.canonicalAlias.length<3||
       admission.canonicalAlias.length>24) deny();
    const headers=requestContext?.headers;
    if(!headers||typeof headers!=="object"||
       canonicalOrigin(headers.origin)!==origin) deny();
    const bearer=extractPay54BearerCredential(requestContext);
    let csrf,idempotency;
    try{
      csrf=decodeToken(headers["x-pay54-csrf"]);
      idempotency=decodeToken(headers["idempotency-key"]);
      const accountId=admission.accountId.toLowerCase();
      const principalId=admission.principalId.toLowerCase();
      const sessionId=admission.sessionId.toLowerCase();
      // Unambiguous length-prefixed encoding, including all identity fields.
      const fields=[accountId,principalId,sessionId,
        String(admission.sessionVersion),admission.canonicalAlias];
      const encoded=fields.map(x=>x.length+":"+x).join("|");
      const requestDigest=sha(Buffer.from(encoded,"utf8"));
      const keyDigest=createHmac("sha256",privateKey)
        .update("PAY54_PAYTAG_IDEMPOTENCY_V1\0","utf8")
        .update(accountId,"utf8").update("\0","utf8")
        .update(idempotency).digest("hex");
      return Object.freeze({
        schema:"pay54.paytag.registration-request-binding.v1",
        accountId,principalId,sessionId,
        sessionVersion:admission.sessionVersion,
        canonicalAlias:admission.canonicalAlias,
        sessionTokenDigest:digestPay54BearerToken(bearer),
        csrfDigest:sha(csrf),
        idempotencyKeyDigest:keyDigest,
        requestDigest,
        registryWriteAuthorised:false,
        requiresSameTransactionDatabaseRevalidation:true,
        paymentAuthorised:false,
        productionRelease:"BLOCKED"
      });
    }catch{deny();}
    finally{
      csrf?.fill(0);
      idempotency?.fill(0);
    }
  };
}

/**
 * Constant-time digest comparison for a trusted executor's replay decision.
 * The database MUST still enforce account-scoped UNIQUE key arbitration.
 */
export function samePay54RequestDigest(left,right){
  const a=fixedHex(left);
  const b=fixedHex(right);
  return timingSafeEqual(a,b);
}
