"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54ProviderWebhookReceipt as inspect}
 from "../governance/pay54-batch27-provider-webhook-replay.mjs";
const x={eventIdDigest:"a".repeat(64),
 signatureValidated:true,eventReceivedAtMs:1800000000000,
 signatureTimestampMs:1800000001000,duplicateReceipt:false};
test("1169: provider signature claim cannot post money",()=>{
 const r=inspect(x);
 assert.equal(r.timestampSkewWithinFiveMinutes,true);
 assert.equal(r.webhookLedgerExecutionAuthorised,false);
});
test("1169: replay and stale timestamps stay classified but do not settle",()=>{
 assert.equal(inspect({...x,duplicateReceipt:true}).replayIndicated,true);
 assert.equal(inspect({...x,signatureTimestampMs:x.eventReceivedAtMs-400000})
  .timestampSkewWithinFiveMinutes,false);
 assert.throws(()=>inspect({...x,eventIdDigest:"unsafe"}),
 /PROVIDER_WEBHOOK_REPLAY_DENIED/);
});
