"use strict";
/** PAY54 Batch 27 / 1180 — website rollback must never rewind money ledger. */
const SHA=/^[a-f0-9]{40}$/;
const deny=()=>{throw Error("PAY54_LEDGER_RECOVERY_SAFETY_DENIED");};
export function inspectPay54SafeWebsiteRollback({
 currentWebsiteSha,restoredWebsiteSha,
 ledgerSchemaChanged,ledgerEntriesReversed,
 paymentSettlementReplayRequested
}={}){
 if(!SHA.test(currentWebsiteSha??"") ||
    !SHA.test(restoredWebsiteSha??"")||
    currentWebsiteSha===restoredWebsiteSha ||
    [ledgerSchemaChanged,ledgerEntriesReversed,
     paymentSettlementReplayRequested].some(v=>typeof v!=="boolean"))deny();
 const safe=!ledgerSchemaChanged&&!ledgerEntriesReversed&&
   !paymentSettlementReplayRequested;
 return Object.freeze({
  schema:"pay54.website-rollback-ledger-protection.v1",
  rollbackSeparatesFrontendFromMoneyEngine:safe,
  unsafeFinancialSideEffectsDeclared:!safe,
  actualRollbackOperatorIndependentlyWitnessed:false,
  ledgerContinuityIndependentlyChecked:false,
  webpageRollbackAuthorised:false,
  financialLedgerMutationAuthorised:false
 });
}
