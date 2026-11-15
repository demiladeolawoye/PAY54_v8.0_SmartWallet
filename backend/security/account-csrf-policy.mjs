"use strict";
/* Source-only browser account access origin policy.
 * Does not accept forged Origin/Host as authentication. Future runtime requires
 * edge TLS, cookie SameSite/Secure/HttpOnly and independently tested CSRF tokens.
 */
export function createAccountCsrfPolicy({trustedOrigins}){
 if(!Array.isArray(trustedOrigins)||trustedOrigins.length<1||trustedOrigins.length>8)throw new TypeError("ORIGIN_POLICY_INVALID");
 const origins=new Set();
 for(const value of trustedOrigins){
  let parsed;
  try{parsed=new URL(value);}catch{throw new TypeError("ORIGIN_POLICY_INVALID");}
  if(parsed.origin!==value||parsed.protocol!=="https:"||parsed.username||parsed.password||
     parsed.hostname==="localhost"||parsed.hash||parsed.search||parsed.pathname!=="/"){
   throw new TypeError("ORIGIN_POLICY_INVALID");
  }
  origins.add(parsed.origin);
 }
 return Object.freeze({
  assertReadOrigin(headers){
   const origin=headers?.origin;
   const fetchSite=headers?.["sec-fetch-site"];
   if(typeof origin!=="string"||!origins.has(origin)||
      (fetchSite!==undefined && !["same-origin","same-site"].includes(fetchSite))){
    throw new Error("ORIGIN_NOT_AUTHORISED");
   }
   return true;
  },
  allowedOrigins:Object.freeze([...origins])
 });
}
