"use strict";

/**
 * PAY54 Batch 24 / 944 — allowlisted identity security telemetry.
 * No token, CSRF, signed assertion, database hostname, customer ID, wallet
 * amount, account descriptor or authentication request body can be logged.
 * The returned record is an immutable redacted event, not a stored audit.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TYPES=new Set([
 "IDENTITY_ASSERTION_DENIED","ASSERTION_REPLAY_DENIED",
 "BOOTSTRAP_ISSUANCE_DENIED","BOOTSTRAP_ISSUED",
 "FIRST_ACCOUNT_BINDING_DENIED","SESSION_COMMIT_UNCERTAIN"
]);
const REASONS=new Set([
 "INVALID_SIGNATURE","BAD_ORIGIN","EXPIRED","REPLAY",
 "DATABASE_UNAVAILABLE","PERMISSION_DENIED","COMMIT_UNCERTAIN",
 "UNEXPECTED_RESPONSE","SUCCESS"
]);
const keys=["eventType","reasonCode","correlationId","occurredAtMs"];
const deny=()=>{throw new Error("PAY54_IDENTITY_TELEMETRY_DENIED");};
export function redactPay54IdentitySecurityEvent(record){
 if(!record || typeof record!=="object" || Array.isArray(record) ||
    Object.getPrototypeOf(record)!==Object.prototype ||
    Object.keys(record).length!==keys.length ||
    !keys.every(key=>Object.hasOwn(record,key)) ||
    !TYPES.has(record.eventType) ||
    !REASONS.has(record.reasonCode) ||
    !UUID.test(record.correlationId??"") ||
    !Number.isSafeInteger(record.occurredAtMs) ||
    record.occurredAtMs<=0)deny();
 if(record.eventType==="BOOTSTRAP_ISSUED" &&
    record.reasonCode!=="SUCCESS")deny();
 if(record.eventType!=="BOOTSTRAP_ISSUED" &&
    record.reasonCode==="SUCCESS")deny();
 return Object.freeze({
  schema:"pay54.redacted-identity-security-event.v1",
  eventType:record.eventType,
  reasonCode:record.reasonCode,
  correlationId:record.correlationId.toLowerCase(),
  occurredAtMs:record.occurredAtMs,
  customerIdentifierIncluded:false,
  credentialIncluded:false,
  financialInstructionIncluded:false
 });
}
