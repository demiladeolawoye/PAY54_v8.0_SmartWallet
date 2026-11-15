"use strict";
import {requireTrustedPrincipal} from "../domain/trusted-account-principal.mjs";
/* Ephemeral server-only request identity; account choice must still be
 * independently checked by current membership. */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sealed=new WeakSet();
export function createAccountIdentityEnvelope({principal,requestedAccountId}){
 const subjectId=requireTrustedPrincipal(principal);
 if(typeof requestedAccountId!=="string"||!UUID.test(requestedAccountId)){
  throw new Error("ACCOUNT_IDENTITY_DENIED");
 }
 const envelope=Object.freeze({subjectId,accountId:requestedAccountId.toLowerCase(),
  requiresCurrentMembership:true,financialExecutionEnabled:false});
 sealed.add(envelope);
 return envelope;
}
export function requireAccountIdentityEnvelope(value){
 if(!value||typeof value!=="object"||!sealed.has(value))throw new Error("ACCOUNT_IDENTITY_DENIED");
 return value;
}
