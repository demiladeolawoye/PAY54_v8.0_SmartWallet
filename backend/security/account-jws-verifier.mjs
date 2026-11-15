"use strict";
import {verify} from "node:crypto";
/* Strict compact JWS EdDSA verifier; does not parse HTTP cookies/headers.
 * Requires injected pinned trust policy and revocation verification.
 * This is a source-only integration contract, not production auth enablement. */
const B64=/^[A-Za-z0-9_-]+$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const decoder=new TextDecoder("utf-8",{fatal:true});
function parsePart(part,maxLength){
  if(typeof part!=="string"||part.length>maxLength||!B64.test(part))throw new Error("SESSION_INVALID");
  let raw;
  try {
    raw=Buffer.from(part,"base64url");
    if(raw.toString("base64url")!==part)throw new Error("noncanonical");
    return JSON.parse(decoder.decode(raw));
  }catch{throw new Error("SESSION_INVALID");}
}
export function createAccountJwsVerifier({trustPolicy,revocationGuard,issuer,audience,now=()=>Date.now()}){
  if(!trustPolicy||typeof trustPolicy.getActiveKey!=="function"||
     !revocationGuard||typeof revocationGuard.check!=="function"||
     typeof issuer!=="string"||issuer.length<3||issuer.length>256||
     typeof audience!=="string"||audience.length<3||audience.length>256||
     typeof now!=="function")throw new TypeError("JWS_VERIFIER_CONFIG_INVALID");
  return Object.freeze({
    async verifyCompactJws(token){
      if(typeof token!=="string"||token.length>4096)throw new Error("SESSION_INVALID");
      const parts=token.split(".");
      if(parts.length!==3 || parts.some(p=>!B64.test(p)))throw new Error("SESSION_INVALID");
      const [encodedHeader,encodedPayload,encodedSignature]=parts;
      const header=parsePart(encodedHeader,768);
      const payload=parsePart(encodedPayload,2048);
      if(!header||typeof header!=="object"||Array.isArray(header)||
         Object.keys(header).sort().join(",")!=="alg,kid,typ"||
         header.alg!=="EdDSA"||header.typ!=="JWT"){
        throw new Error("SESSION_INVALID");
      }
      const key=trustPolicy.getActiveKey(header.kid);
      if(!key)throw new Error("SESSION_INVALID");
      if(!payload||typeof payload!=="object"||Array.isArray(payload)||
         Object.keys(payload).sort().join(",")!=="aud,exp,iat,iss,jti,nbf,sub"||
         payload.iss!==issuer||payload.aud!==audience||
         typeof payload.sub!=="string"||!UUID.test(payload.sub)||
         typeof payload.jti!=="string"||!UUID.test(payload.jti)){
        throw new Error("SESSION_INVALID");
      }
      const seconds=Math.floor(now()/1000);
      if(!Number.isSafeInteger(seconds)||!Number.isSafeInteger(payload.iat)||
         !Number.isSafeInteger(payload.nbf)||!Number.isSafeInteger(payload.exp)||
         payload.iat>seconds+30||payload.iat<seconds-900||
         payload.nbf>seconds||payload.nbf<payload.iat-30||
         payload.exp<=seconds||payload.exp>payload.iat+900||
         payload.exp<=payload.iat)throw new Error("SESSION_INVALID");
      let signature;
      try{
        signature=Buffer.from(encodedSignature,"base64url");
        if(signature.length!==64 || signature.toString("base64url")!==encodedSignature ||
           !verify(null,Buffer.from(encodedHeader+"."+encodedPayload),key,signature)){
          throw new Error("bad signature");
        }
      }catch{throw new Error("SESSION_INVALID");}
      await revocationGuard.check({jti:payload.jti,subjectId:payload.sub,expiresAt:payload.exp});
      return Object.freeze({subjectId:payload.sub.toLowerCase(),issuedAt:payload.iat,
        notBefore:payload.nbf,expiresAt:payload.exp,authenticated:true,revoked:false});
    }
  });
}
