"use strict";
import {createPublicKey} from "node:crypto";
/* Pinned Ed25519 public keys only; no remote JWKS, private keys or discovery. */
const KEY_ID=/^[a-zA-Z0-9_-]{1,64}$/;
export function createAccountTrustKeyPolicy(keys) {
  if(!Array.isArray(keys)||keys.length<1||keys.length>8)throw new TypeError("TRUST_KEYS_INVALID");
  const result=new Map();
  for(const key of keys) {
    if(!key||typeof key!=="object"||!KEY_ID.test(key.kid)||
       !["ACTIVE","RETIRED"].includes(key.status)||
       typeof key.publicKeyPem!=="string"||result.has(key.kid)){
      throw new TypeError("TRUST_KEYS_INVALID");
    }
    let publicKey;
    try{publicKey=createPublicKey(key.publicKeyPem);}catch{throw new TypeError("TRUST_KEYS_INVALID");}
    if(publicKey.asymmetricKeyType!=="ed25519")throw new TypeError("TRUST_KEYS_INVALID");
    result.set(key.kid,Object.freeze({kid:key.kid,status:key.status,publicKey}));
  }
  if(![...result.values()].some(key=>key.status==="ACTIVE"))throw new TypeError("TRUST_KEYS_INVALID");
  return Object.freeze({
    getActiveKey(kid){
      if(typeof kid!=="string")return null;
      const key=result.get(kid);
      return key?.status==="ACTIVE"?key.publicKey:null;
    },
    activeKeyIds:Object.freeze([...result.values()].filter(x=>x.status==="ACTIVE").map(x=>x.kid))
  });
}
