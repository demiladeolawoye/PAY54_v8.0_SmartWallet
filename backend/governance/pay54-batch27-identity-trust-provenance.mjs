"use strict";
/** Batch27/1138 — track exact Ed25519 identity trust roots, no private keys. */
import {createPublicKey,createHash} from "node:crypto";
const deny=()=>{throw Error("PAY54_IDENTITY_TRUST_PROVENANCE_DENIED");};
const KID=/^[a-zA-Z0-9._-]{8,128}$/;
export function inspectPay54IdentityTrustProvenance({
 issuer,expectedAudience,keyId,publicKeyPem
}={}){
 if(typeof issuer!=="string"||!issuer.startsWith("https://")||
    typeof expectedAudience!=="string" ||
    expectedAudience!=="pay54:session-issuer" ||
    !KID.test(keyId??"")||
    typeof publicKeyPem!=="string" ||
    !publicKeyPem.startsWith("-----BEGIN PUBLIC KEY-----") ||
    !publicKeyPem.trimEnd().endsWith("-----END PUBLIC KEY-----"))deny();
 let key;
 try{key=createPublicKey(publicKeyPem);}catch{deny();}
 if(key.type!=="public"||key.asymmetricKeyType!=="ed25519")deny();
 const bytes=key.export({format:"der",type:"spki"});
 return Object.freeze({
  schema:"pay54.identity-public-trust-fingerprint.v1",
  issuer,expectedAudience,keyId,
  publicKeySpkiSha256:createHash("sha256").update(bytes).digest("hex"),
  signingPrivateKeyIncluded:false,
  identityProviderKeyOwnershipIndependentlyVerified:false,
  realCustomerAuthenticationEnabled:false,
  productionReleaseAuthorised:false
 });
}
