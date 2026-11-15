"use strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
/* Source-only session admission: the caller must inject a trusted token
 * extractor (not a browser-selected account ID) and a pinned JWS verifier.
 * This module registers no route, cookie, password provider or login. */
export function createAccountSignedSessionAdapter({extractSessionToken,verifier}){
 if(typeof extractSessionToken!=="function"||!verifier||
    typeof verifier.verifyCompactJws!=="function"){
  throw new TypeError("SIGNED_SESSION_ADAPTER_REQUIRED");
 }
 return createTrustedAccountPrincipalResolver({
  verifyServerSession:async request=>{
   const token=await extractSessionToken(request);
   if(typeof token!=="string"||token.length<20||token.length>4096){
    throw new Error("ACCOUNT_AUTH_REQUIRED");
   }
   return verifier.verifyCompactJws(token);
  }
 });
}
