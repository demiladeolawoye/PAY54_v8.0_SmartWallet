"use strict";

/* PAY54 Batch 04 — PII-minimised security decision event projector.
 * No customer identifiers, tokens, request payloads or account IDs logged.
 * This is an unmounted contract; the sink is injected and must be reliable.
 */
const OUTCOMES=new Set(["ALLOWED","DENIED","ERROR"]);
const OPERATIONS=new Set(["ACCOUNT_LIST","ACCOUNT_SELECT","WALLET_LIST"]);
const REASONS=new Set(["POLICY_OK","NO_SESSION","NO_MEMBERSHIP","REVOKED",
  "SUSPENDED","BAD_REQUEST","UNAVAILABLE","POLICY_DENIED"]);
export function createAccountAccessAudit({emitAuditEvent,now=()=>new Date()}={}){
  if(typeof emitAuditEvent!=="function"||typeof now!=="function"){
    throw new TypeError("Trusted audit sink and clock required");
  }
  return Object.freeze({
    async record({operation,outcome,reason}){
      if(!OPERATIONS.has(operation)||!OUTCOMES.has(outcome)||!REASONS.has(reason) ||
        (outcome==="ALLOWED" && reason!=="POLICY_OK") ||
        (outcome!=="ALLOWED" && reason==="POLICY_OK")) {
        throw new TypeError("Invalid account audit decision");
      }
      const date=now();
      if(!(date instanceof Date)||Number.isNaN(date.valueOf())){
        throw new TypeError("Invalid audit time");
      }
      const event=Object.freeze({
        schema:"PAY54_ACCOUNT_ACCESS_V1",operation,outcome,reason,
        occurredAt:date.toISOString(),financialExecutionEnabled:false
      });
      await emitAuditEvent(event);
      return event;
    }
  });
}
