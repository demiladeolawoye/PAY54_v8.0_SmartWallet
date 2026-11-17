"use strict";

/**
 * PAY54 Batch 24 / 957 — externally provisioned staging identity trust roots.
 * No browser-driven discovery, jku/jwks_uri, unsigned token, dynamic issuer,
 * cookie or private key is accepted. No session service is activated here.
 */
import { createPublicKey } from "node:crypto";
const KID=/^[A-Za-z0-9._-]{8,128}$/;
const deny=()=>{throw new Error("PAY54_STAGING_IDENTITY_TRUST_DENIED");};
export function loadPay54StagingIdentityTrust(env){
 if(!env || typeof env!=="object" ||
    env.PAY54_ENV!=="staging" ||
    env.PAY54_REAL_MONEY_MODE!=="false" ||
    env.PAY54_STAGING_IDENTITY_TRUST_ENABLED!=="true" ||
    typeof env.PAY54_STAGING_IDENTITY_ISSUER!=="string" ||
    typeof env.PAY54_STAGING_IDENTITY_AUDIENCE!=="string" ||
    typeof env.PAY54_STAGING_IDENTITY_KEYS_JSON!=="string")deny();

 const issuer=env.PAY54_STAGING_IDENTITY_ISSUER;
 const audience=env.PAY54_STAGING_IDENTITY_AUDIENCE;
 let url;
 try{url=new URL(issuer);}catch{deny();}
 if(url.protocol!=="https:" || url.origin!==issuer ||
    url.username || url.password || url.search || url.hash ||
    issuer.length>200 ||
    !/^[A-Za-z0-9:._/-]{4,128}$/.test(audience))deny();
 let source;
 try{source=JSON.parse(env.PAY54_STAGING_IDENTITY_KEYS_JSON);}catch{deny();}
 if(!source || typeof source!=="object" || Array.isArray(source))deny();
 const names=Object.keys(source);
 if(names.length<1 || names.length>8)deny();
 const keys=Object.create(null);
 for(const kid of names){
  if(!KID.test(kid) || typeof source[kid]!=="string" ||
     source[kid].length>4096 ||
     source[kid].includes("PRIVATE KEY"))deny();
  try{
   const publicKey=createPublicKey(source[kid]);
   if(publicKey.asymmetricKeyType!=="ed25519")deny();
   keys[kid]=publicKey.export({format:"pem",type:"spki"});
  }catch{deny();}
 }
 return Object.freeze({
  schema:"pay54.staging-identity-trust.v1",
  trustedIssuer:issuer,
  expectedAudience:audience,
  trustedPublicKeys:Object.freeze(keys),
  identityProviderConnected:false,
  customerLoginEnabled:false,
  deploymentAuthorised:false
 });
}
