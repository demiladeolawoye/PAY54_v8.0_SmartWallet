"use strict";
/** PAY54 Batch 27 / 1168 — provider webhook signature and JTI replay evidence. */
const HASH=/^[a-f0-9]{64}$/;
const deny=()=>{throw Error("PAY54_PROVIDER_WEBHOOK_REPLAY_DENIED");};
export function inspectPay54ProviderWebhookReceipt({
 eventIdDigest,signatureValidated,eventReceivedAtMs,
 signatureTimestampMs,duplicateReceipt
}={}){
 if(!HASH.test(eventIdDigest??"") ||
    typeof signatureValidated!=="boolean"||
    typeof duplicateReceipt!=="boolean" ||
    !Number.isSafeInteger(eventReceivedAtMs)||eventReceivedAtMs<1 ||
    !Number.isSafeInteger(signatureTimestampMs)||signatureTimestampMs<1)deny();
 const skew=Math.abs(eventReceivedAtMs-signatureTimestampMs);
 return Object.freeze({
  schema:"pay54.provider-webhook-replay-evidence.v1",
  signatureValidatedClaimed:signatureValidated,
  timestampSkewWithinFiveMinutes:skew<=300000,
  replayIndicated:duplicateReceipt,
  settlementEntryMustNotBePostedFromThisRecord:true,
  providerSignatureIndependentlyReverified:false,
  webhookLedgerExecutionAuthorised:false
 });
}
