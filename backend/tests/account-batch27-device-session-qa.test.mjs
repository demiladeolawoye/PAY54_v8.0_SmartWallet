"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54DeviceSessionIsolationEvidence as inspect}
 from "../governance/pay54-batch27-device-session-qa.mjs";
const a={principalId:"11111111-1111-4111-8111-111111111111",
 activeAccountId:"22222222-2222-4222-8222-222222222222",
 sessionVersion:2,staleCacheCleared:true,oldSessionRejected:true,
 secondDeviceRevoked:true};
test("1179: reported device-session isolation needs real authenticated traces",()=>{
 const r=inspect(a);
 assert.equal(r.claimedAccountCacheInvalidated,true);
 assert.equal(r.authenticatedDeviceTraceIndependentlyVerified,false);
 assert.equal(r.productionAccountSwitchEnabled,false);
});
test("1179: missing device identity or wrong version is rejected",()=>{
 assert.throws(()=>inspect({...a,activeAccountId:"not-uuid"}),
 /DEVICE_SESSION_ISOLATION_DENIED/);
 assert.throws(()=>inspect({...a,sessionVersion:0}),
 /DEVICE_SESSION_ISOLATION_DENIED/);
});
