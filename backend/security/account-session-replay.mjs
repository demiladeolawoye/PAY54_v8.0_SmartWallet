"use strict";
/* Source-only replay gate. Durable/atomic claim store must be injected;
 * local in-process memory alone is not sufficient for production sessions. */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createAccountSessionReplayPolicy({atomicClaim,now=()=>Date.now()}={}){
 if(typeof atomicClaim!=="function"||typeof now!=="function")throw new TypeError("REPLAY_BACKEND_REQUIRED");
 return Object.freeze({
  async consume({jti,subjectId,expiresAt}){
   if(typeof jti!=="string"||!UUID.test(jti)||typeof subjectId!=="string"||
      !UUID.test(subjectId)||!Number.isSafeInteger(expiresAt)||
      !Number.isSafeInteger(now())||expiresAt*1000<=now()){
    throw new Error("SESSION_REPLAY_DENIED");
   }
   let claimed;
   try{claimed=await atomicClaim({jti,subjectId,expiresAt});}
   catch{throw new Error("REPLAY_BACKEND_UNAVAILABLE");}
   if(claimed!==true)throw new Error("SESSION_REPLAY_DENIED");
   return Object.freeze({accepted:true,financialExecutionEnabled:false});
  }
 });
}
