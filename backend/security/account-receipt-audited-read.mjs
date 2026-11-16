"use strict";

/*
 * PAY54 Batch 10 item 232 — audited display-only result gate.
 * The result is never returned unless a matching audit receipt has been
 * accepted. This is source-only and does NOT validate live audit durability.
 */
export function createAccountReceiptAuditedRead({read,audit}={}) {
 if (typeof read!=="function" || !audit || typeof audit.publish!=="function") {
  throw new TypeError("ACCOUNT_RECEIPT_READ_CONFIG_INVALID");
 }
 return Object.freeze({
  async execute(request){
   let value;
   try {
    value=await read(request);
    if (!value || typeof value!=="object" ||
        value.financialExecutionEnabled!==false ||
        value.customerDataAccessEnabled!==false) {
     throw new Error("ACCOUNT_READ_RESULT_INVALID");
    }
   } catch {
    try {
     await audit.publish({
      operation:"ACCOUNT_SELECT",outcome:"ERROR",reason:"UNAVAILABLE"
     });
    } catch {
     // All internal failures share the same public denial boundary.
    }
    throw new Error("ACCOUNT_READ_DENIED");
   }
   try {
    const receipt=await audit.publish({
     operation:"ACCOUNT_SELECT",outcome:"ALLOWED",reason:"POLICY_OK"
    });
    if (!receipt || receipt.receiptAccepted!==true ||
        receipt.sourceAckOnly!==true ||
        receipt.durableStorageIndependentlyVerified!==false ||
        receipt.financialExecutionEnabled!==false) {
     throw new Error("ACCOUNT_AUDIT_UNAVAILABLE");
    }
    return value;
   } catch {
    throw new Error("ACCOUNT_READ_DENIED");
   }
  }
 });
}
