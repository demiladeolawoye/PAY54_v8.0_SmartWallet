"use strict";
/* Source-only privacy-safe audit envelope; no user identifiers or secrets.
 * Requires an injected, durable sink before operational use. */
import {randomUUID} from "node:crypto";
const OPS=new Set(["ACCOUNT_LIST","ACCOUNT_SELECT","WALLET_LIST"]);
const RESULTS=new Set(["ALLOWED","DENIED","ERROR"]);
const REASONS=new Set(["POLICY_OK","NO_SESSION","REVOKED","NO_MEMBERSHIP",
 "BAD_REQUEST","POLICY_DENIED","UNAVAILABLE"]);
export function createAccountAuditEnvelope({sink,now=()=>new Date(),makeId=randomUUID}={}){
 if(typeof sink!=="function"||typeof now!=="function"||typeof makeId!=="function")
   throw new TypeError("AUDIT_SINK_REQUIRED");
 return Object.freeze({
  async publish({operation,outcome,reason}){
   if(!OPS.has(operation)||!RESULTS.has(outcome)||!REASONS.has(reason)||
      (outcome==="ALLOWED")!==(reason==="POLICY_OK")){
     throw new Error("AUDIT_DECISION_INVALID");
   }
   const date=now(),id=makeId();
   if(!(date instanceof Date)||!Number.isFinite(date.getTime())||
      typeof id!=="string"||!(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i).test(id)){
     throw new Error("AUDIT_METADATA_INVALID");
   }
   const event=Object.freeze({schema:"PAY54_ACCOUNT_AUDIT_V2",eventId:id,
    operation,outcome,reason,occurredAt:date.toISOString(),financialExecutionEnabled:false});
   await sink(event);
   return event;
  }
 });
}
