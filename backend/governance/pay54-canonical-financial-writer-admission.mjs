"use strict";
/**
 * Batch56: no-go governance gate for the CANONICAL PAY54 money procedures.
 * Source evidence cannot prove a real privilege, identity or posting;
 * even if all fields are self-reported, no release authority is issued.
 */
export const PAY54_CANONICAL_PROCEDURES=Object.freeze([
"pay54.reserve_wallet_transfer",
"pay54.capture_reserved_wallet_transfer",
"pay54.release_reserved_wallet_transfer"
]);
export const PAY54_FINANCIAL_RELATIONS=Object.freeze([
"financial_operations","idempotency_records","balance_reservations",
"ledger_accounts","wallets","ledger_journals","ledger_entries",
"outbox_events","provider_attempts"
]);
const REQUIREMENTS=Object.freeze([
"trustedPrincipalBoundInsideTransaction",
"tokenAndSessionVerifiedUnderRowLock",
"accountMembershipAndWalletOwnershipVerified",
"revocationUsesSameDatabaseLock",
"nonSuperuserEffectiveWriterProven",
"noBypassRlsOrRoleEscalation",
"allCanonicalFunctionsExecuted",
"minimumGrantsAndPoliciesDbaReviewed",
"crossAccountDeniedUnderRls",
"ledgerDoubleEntryBalanced",
"reservationLifecycleIdempotent",
"concurrentCaptureReleaseCorrect",
"concurrentRevocationAgainstMoneyCorrect",
"outboxAtomicWithLedgerCommit",
"operationalRollbackRehearsed",
"positiveAndNegativePg16SuitesGreen",
"securityReviewSigned",
"dbaReviewSigned"
]);
export const PAY54_CANONICAL_ADMISSION_REQUIREMENTS=REQUIREMENTS;
export function assessCanonicalWriterEvidence(evidence){
 if(evidence===null||typeof evidence!=="object"||Array.isArray(evidence))
  throw new TypeError("PAY54_B56_EVIDENCE_OBJECT_REQUIRED");
 const invalid=[];
 const missing=[];
 const unproven=[];
 for(const key of REQUIREMENTS){
   if(!Object.hasOwn(evidence,key))missing.push(key);
   else if(typeof evidence[key]!=="boolean")invalid.push(key);
   else if(evidence[key]!==true)unproven.push(key);
 }
 const assertedComplete=!invalid.length&&!missing.length&&!unproven.length;
 return Object.freeze({
  schema:"pay54.canonical-financial-writer-admission.v1",
  status:assertedComplete?"INDEPENDENT_EVIDENCE_AUDIT_REQUIRED":"NO_GO",
  assertedComplete,
  missing:Object.freeze(missing),
  invalid:Object.freeze(invalid),
  unproven:Object.freeze(unproven),
  canonicalFinancialWriterVerified:false,
  independentEvidenceAuthenticityVerified:false,
  sourceMergeAuthorised:false,
  realMoneyExecutionAuthorised:false,
  cloudSpendingAuthorised:false,
  stagingAuthorised:false,
  productionAuthorised:false
 });
}
