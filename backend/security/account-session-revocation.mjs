"use strict";
/* In-memory negative/replay guards for isolated tests; production revocation
 * MUST use trusted durable backend storage before session activation. */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createAccountRevocationGuard({isRevoked,now=()=>Date.now()}={}){
  if(typeof isRevoked!=="function"||typeof now!=="function")throw new TypeError("REVOCATION_BACKEND_REQUIRED");
  return Object.freeze({
    async check({jti,subjectId,expiresAt}){
      if(typeof jti!=="string"||!UUID.test(jti)||typeof subjectId!=="string"||
         !UUID.test(subjectId)||!Number.isSafeInteger(expiresAt)||expiresAt*1000<=now()){
        throw new Error("SESSION_REVOKED_OR_EXPIRED");
      }
      let revoked;
      try{revoked=await isRevoked({jti,subjectId,expiresAt});}
      catch{throw new Error("REVOCATION_UNAVAILABLE");}
      if(revoked!==false)throw new Error("SESSION_REVOKED_OR_EXPIRED");
      return true;
    }
  });
}
