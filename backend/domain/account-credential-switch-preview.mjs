"use strict";
import {requireAccountCredentialBinding} from "../security/account-credential-binding.mjs";

/*
 * Batch 10 item 226. Test-only account switching PREVIEW:
 * consuming a one-use selection intent is never permission to switch a
 * real session, issue a payment, or activate customer database SELECT.
 */
export function createAccountCredentialSwitchPreview({selectionPolicy,membershipGate}) {
 if (!selectionPolicy || typeof selectionPolicy.consume !== "function" ||
     !membershipGate || typeof membershipGate.read !== "function") {
  throw new TypeError("ACCOUNT_SWITCH_PREVIEW_CONFIG_INVALID");
 }
 return Object.freeze({
  async preview({selectionIntent,dbPrincipal,binding}) {
   const issued=requireAccountCredentialBinding(binding);
   if (issued.environment !== "test")throw new Error("ACCOUNT_SWITCH_PREVIEW_DENIED");
   // Intent is consumed once even when the subsequent membership check fails.
   const selection=selectionPolicy.consume(selectionIntent);
   if (!selection ||
       selection.requestedAccountId !== issued.accountId ||
       selection.selectionAuthorised !== false ||
       selection.financialExecutionEnabled !== false ||
       selection.requiresFreshServerMembershipCheck !== true) {
    throw new Error("ACCOUNT_SWITCH_PREVIEW_DENIED");
   }
   return membershipGate.read({dbPrincipal,binding:issued,callback:async context=>{
    if (!context || context.accountId !== issued.accountId ||
        context.displayOnly !== true ||
        context.financialExecutionEnabled !== false) {
     throw new Error("ACCOUNT_SWITCH_PREVIEW_DENIED");
    }
    return Object.freeze({
     accountId:issued.accountId,
     previewEligible:true,
     sessionSwitched:false,
     customerDataAccessEnabled:false,
     financialExecutionEnabled:false
    });
   }});
  }
 });
}
