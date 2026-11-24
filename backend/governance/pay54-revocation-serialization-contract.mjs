"use strict";
const EVENTS=Object.freeze(["SESSION_LOCK_ACQUIRED","SESSION_VALIDATED","FINANCIAL_INVARIANTS_VALIDATED","FINANCIAL_WRITE","OUTBOX_WRITTEN","TRANSACTION_COMMITTED","SESSION_LOCK_RELEASED"]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HEX=/^[0-9a-f]{64}$/;
const record=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);
/** Offline evidence only; not an authentic database trace or financial authority. */
export function assessPay54SerializationTrace(evidence){
 if(!record(evidence))throw new TypeError("PAY54_B48_INVALID_SERIALIZATION_EVIDENCE");
 const findings=[];
 if(evidence.environment!=="DISPOSABLE_PG16")findings.push("DISPOSABLE_PG16_NOT_PROVEN");
 if(!UUID.test(evidence.sessionId??""))findings.push("INVALID_SESSION_ID");
 if(!UUID.test(evidence.accountId??""))findings.push("INVALID_ACCOUNT_ID");
 if(!UUID.test(evidence.credentialDigest??""))findings.push("INVALID_CREDENTIAL_DIGEST");
 if(!HEX.test(evidence.credentialDigest??""))findings.push("INVALID_CREDENTIAL_DIGEST");
 if(!Number.isSafeInteger(evidence.sessionVersion)||evidence.sessionVersion<1)findings.push("INVALID_SESSION_VERSION");
 if(typeof evidence.transactionId!=="string"||!UUID.test(evidence.transactionId))findings.push("INVALID_TRANSACTION_ID");
 if(!Array.isArray(evidence.events)||evidence.events.length!==EVENTS.length||
 evidence.events.some((item,i)=>!record(item)||item.type!==EVENTS[i]||
 !Number.isSafeInteger(item.order)||item.order!==i+1||item.transactionId!==evidence.transactionId))
  findings.push("TRANSACTION_EVENT_SEQUENCE_UNVERIFIED");
 if(evidence.lockKey!==`session:${evidence.sessionId}`)findings.push("SESSION_LOCK_IDENTITY_MISMATCH");
 if(evidence.revocationUsesSameLock!==true)findings.push("REVOKER_LOCK_PROTOCOL_NOT_PROVEN");
 if(evidence.writerIsNonSuperuser!==true||evidence.writerBypassRls!==false)findings.push("WRITER_LEAST_PRIVILEGE_NOT_PROVEN");
 if(evidence.postMigrationRlsVerified!==true)findings.push("FORCED_RLS_NOT_VERIFIED");
 if(evidence.ledgerBalanced!==true||evidence.outboxAtomic!==true)findings.push("FINANCIAL_ATOMICITY_NOT_PROVEN");
 if(evidence.replayAndRaceTestsPassed!==true)findings.push("PHYSICAL_CONCURRENCY_TEST_NOT_PROVEN");
 if(evidence.revocationAfterCommitSemanticsDocumented!==true)findings.push("REVOCATION_LINEARIZATION_CONTRACT_MISSING");
 const inputComplete=findings.length===0;
 return Object.freeze({
  schema:"pay54.revocation-serialization-evidence.v1",
  status:inputComplete?"INDEPENDENT_DATABASE_REVIEW_REQUIRED":"EVIDENCE_REJECTED",
  inputComplete,findings:Object.freeze([...new Set(findings)]),
  traceAuthenticityEstablished:false,actualPostgresConcurrencyProven:false,
  productionIdentityVerified:false,transactionExecutionAuthorised:false,
  cloudProvisioningAuthorised:false,stagingAuthorised:false,productionAuthorised:false
 });
}
export const PAY54_SERIALIZATION_EVENTS=EVENTS;
