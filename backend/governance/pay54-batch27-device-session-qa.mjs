"use strict";
/** PAY54 Batch 27 / 1178 — mobile/browser session isolation evidence. */
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const deny=()=>{throw Error("PAY54_DEVICE_SESSION_ISOLATION_DENIED");};
export function inspectPay54DeviceSessionIsolationEvidence({
 principalId,activeAccountId,sessionVersion,
 staleCacheCleared,oldSessionRejected,secondDeviceRevoked
}={}){
 if(!UUID.test(principalId??"")||!UUID.test(activeAccountId??"")||
    !Number.isSafeInteger(sessionVersion)||sessionVersion<1 ||
    [staleCacheCleared,oldSessionRejected,secondDeviceRevoked]
     .some(v=>typeof v!=="boolean"))deny();
 return Object.freeze({
  schema:"pay54.multi-device-account-session-review.v1",
  claimedAccountCacheInvalidated:staleCacheCleared,
  claimedRevokedSessionRejected:oldSessionRejected,
  claimedSecondDeviceRevoked:secondDeviceRevoked,
  authenticatedDeviceTraceIndependentlyVerified:false,
  allAccountScopedDataActuallyPurged:false,
  productionAccountSwitchEnabled:false
 });
}
