"use strict";
/* Fresh revocation check for each access, never cached 'not revoked' status.
 * The injected backend must have durable, authoritative state. */
export function createAccountRevocationFreshness({checkAuthoritative,now=()=>Date.now(),maxCheckAgeMs=2000}={}){
 if(typeof checkAuthoritative!=="function"||typeof now!=="function"||
    !Number.isSafeInteger(maxCheckAgeMs)||maxCheckAgeMs<100||maxCheckAgeMs>5000){
  throw new TypeError("REVOCATION_FRESHNESS_CONFIG_INVALID");
 }
 return Object.freeze({
  async assertFresh(session){
   const start=now();
   if(!Number.isSafeInteger(start)||typeof session?.subjectId!=="string"){
     throw new Error("REVOCATION_UNAVAILABLE");
   }
   let verdict;
   try{verdict=await checkAuthoritative(session);}
   catch{throw new Error("REVOCATION_UNAVAILABLE");}
   const end=now();
   if(!Number.isSafeInteger(end)||end<start||end-start>maxCheckAgeMs){
     throw new Error("REVOCATION_UNAVAILABLE");
   }
   if(verdict!==false)throw new Error("SESSION_REVOKED");
   return Object.freeze({current:true,transactionAuthorised:false});
  }
 });
}
