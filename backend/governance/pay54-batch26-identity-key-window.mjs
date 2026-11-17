"use strict";
/** Batch26/1037 — source policy for overlapping, staged Ed25519 trust keys. */
const KID=/^[A-Za-z0-9._-]{8,128}$/;
const deny=()=>{throw Error("PAY54_IDENTITY_KEY_WINDOW_DENIED");};
export function inspectPay54IdentityKeyWindow({keys,nowMs,activeKid}={}){
 if(!Array.isArray(keys)||!keys.length||keys.length>8 ||
    !Number.isSafeInteger(nowMs)||nowMs<=0 ||
    !KID.test(activeKid??""))deny();
 const ids=new Set();
 for(const key of keys){
  if(!key||!KID.test(key.kid??"")||ids.has(key.kid)||
     !Number.isSafeInteger(key.validFromMs) ||
     !Number.isSafeInteger(key.validUntilMs) ||
     key.validFromMs>=key.validUntilMs ||
     key.validUntilMs-key.validFromMs>90*86400000 ||
     key.privateKeyPresent!==false)deny();
  ids.add(key.kid);
 }
 const live=keys.filter(k=>k.validFromMs<=nowMs&&k.validUntilMs>nowMs);
 if(!live.some(k=>k.kid===activeKid))deny();
 return Object.freeze({
  schema:"pay54.identity-key-rollover-evidence-v1",
  currentVerifiedPublicKeyCount:live.length,
  dualKeyOverlapInSource:live.length>=2,
  privateKeyIngressDenied:true,
  runtimeTrustStoreIndependentlyInspected:false,
  idpRevocationPropagationVerified:false,
  customerSessionIssuanceEnabled:false,
  productionReleaseAuthorised:false
 });
}
