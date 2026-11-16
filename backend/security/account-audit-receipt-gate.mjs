"use strict";

import {randomUUID} from "node:crypto";

/*
 * PAY54 Batch 10 item 230 — source-only durable-audit RECEIPT CONTRACT.
 * A callback saying 'persisted' is not proof of physical durability.
 * Before live use, an independent reviewer must attest the actual append-only
 * store, retention, tenant-isolation, consistency and outage behaviour.
 * No customer data or account identifier is included in emitted events.
 */

const VALID_OPS=new Set(["ACCOUNT_LIST","ACCOUNT_SELECT"]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_OUTCOMES=new Set(["ALLOWED","DENIED","ERROR"]);
const issuedReceipts=new WeakSet();
const consumedReceipts=new WeakSet();

/* Consumes exactly one authentic in-process audit receipt, for the expected
 * decision. Neither this provenance check nor a sink acknowledgement proves
 * durable storage. Fail closed for copied, forged or replayed receipts.
 */
export function consumeAccountAuditReceipt(receipt,{operation,outcome,reason}={}) {
 if(!receipt || typeof receipt!=="object" ||
    !issuedReceipts.has(receipt) || consumedReceipts.has(receipt) ||
    receipt.operation!==operation || receipt.outcome!==outcome ||
    receipt.reason!==reason || receipt.receiptAccepted!==true ||
    receipt.sourceAckOnly!==true ||
    receipt.durableStorageIndependentlyVerified!==false ||
    receipt.financialExecutionEnabled!==false) {
  throw new Error("ACCOUNT_AUDIT_RECEIPT_UNTRUSTED");
 }
 consumedReceipts.add(receipt);
 return Object.freeze({acceptedForSourceDisclosure:true,
  durableStorageIndependentlyVerified:false,
  financialExecutionEnabled:false});
}


export function createAccountAuditReceiptGate({emit,makeId=randomUUID,maxEvents=10000}={}) {
 if (typeof emit!=="function" || typeof makeId!=="function" ||
     !Number.isSafeInteger(maxEvents) || maxEvents<1 || maxEvents>20000) {
  throw new TypeError("ACCOUNT_AUDIT_RECEIPT_CONFIG_INVALID");
 }
 const usedEventIds=new Set();
 return Object.freeze({
  async publish({operation,outcome,reason}) {
   if (!VALID_OPS.has(operation) || !VALID_OUTCOMES.has(outcome) ||
       reason!==(outcome==="ALLOWED"?"POLICY_OK":
         outcome==="DENIED"?"POLICY_DENIED":"UNAVAILABLE")) {
    throw new Error("ACCOUNT_AUDIT_RECEIPT_DENIED");
   }
   const eventId=makeId();
   if (typeof eventId!=="string" || !UUID.test(eventId) ||
       usedEventIds.has(eventId) || usedEventIds.size>=maxEvents) {
    throw new Error("ACCOUNT_AUDIT_RECEIPT_DENIED");
   }
   // Reserve before awaiting the writer; failed writes remain un-replayable.
   usedEventIds.add(eventId);
   const event=Object.freeze({
    schema:"PAY54_ACCOUNT_AUDIT_RECEIPT_V1",
    eventId,operation,outcome,reason,
    financialExecutionEnabled:false
   });
   let acknowledgement;
   try {
    acknowledgement=await emit(event);
   } catch {
    throw new Error("ACCOUNT_AUDIT_UNAVAILABLE");
   }
   if (!acknowledgement || typeof acknowledgement!=="object" ||
       Object.keys(acknowledgement).length!==3 ||
       acknowledgement.eventId!==eventId ||
       acknowledgement.accepted!==true ||
       acknowledgement.persistenceConfirmed!==true) {
    throw new Error("ACCOUNT_AUDIT_UNAVAILABLE");
   }
   const receipt=Object.freeze({
    eventId,operation,outcome,reason,receiptAccepted:true,
    sourceAckOnly:true,
    durableStorageIndependentlyVerified:false,
    financialExecutionEnabled:false
   });
   issuedReceipts.add(receipt);
   return receipt;
  }
 });
}
