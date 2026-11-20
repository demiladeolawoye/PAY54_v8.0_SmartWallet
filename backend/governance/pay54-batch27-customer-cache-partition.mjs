"use strict";
/** PAY54 Batch 27 / 1162 — account-scoped client cache key policy. */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DOMAINS=new Set(["wallet","cards","transactions","requests","alerts",
 "beneficiaries","contacts","bills","fx","savings"]);
const deny=()=>{throw Error("PAY54_ACCOUNT_CACHE_PARTITION_DENIED");};
export function derivePay54AccountCacheNamespace({
 principalId,accountId,sessionVersion,domain
}={}){
 if(!UUID.test(principalId??"")||!UUID.test(accountId??"")||
    !Number.isSafeInteger(sessionVersion)||sessionVersion<1 ||
    sessionVersion>999999999 || !DOMAINS.has(domain))deny();
 return Object.freeze({
  schema:"pay54.account-scoped-client-cache-key.v1",
  namespace:["pay54","v1",domain,principalId.toLowerCase(),
   accountId.toLowerCase(),String(sessionVersion)].join(":"),
  sessionRevisionRequired:true,
  localCacheActuallyCleared:false,
  serverAccountMembershipVerified:false,
  productionClientEnabled:false
 });
}
