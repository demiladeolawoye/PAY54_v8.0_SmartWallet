"use strict";
import {randomUUID} from "node:crypto";
/* Independently generated correlation, never user IDs, tokens or request bodies. */
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createAccountAuditCorrelation({generateId=randomUUID}={}){
 if(typeof generateId!=="function")throw new TypeError("AUDIT_CORRELATION_CONFIG");
 return Object.freeze({
  create({operation,outcome}){
   if(!["ACCOUNT_LIST","ACCOUNT_SELECT","WALLET_LIST"].includes(operation)||
      !["ALLOWED","DENIED","ERROR"].includes(outcome))throw new Error("AUDIT_CORRELATION_DENIED");
   const requestId=generateId();
   if(typeof requestId!=="string"||!ID.test(requestId))throw new Error("AUDIT_CORRELATION_DENIED");
   return Object.freeze({requestId,operation,outcome,
    containsIdentity:false,financialExecutionEnabled:false});
  }
 });
}
