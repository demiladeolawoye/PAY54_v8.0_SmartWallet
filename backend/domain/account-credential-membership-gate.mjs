"use strict";
import {requireAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {requireAccountCredentialBinding} from "../security/account-credential-binding.mjs";

/*
 * Batch 10 item 224 — compose existing membership/credential rules, rather
 * than duplicating Personal/Business authorisation logic.
 * This is an unmounted test-only display contract; never payment authority.
 */
export function createAccountCredentialMembershipGate({membershipGate,epochGuard}) {
  if (!membershipGate || typeof membershipGate.assertCurrent !== "function" ||
      !epochGuard || typeof epochGuard.execute !== "function") {
    throw new TypeError("ACCOUNT_CREDENTIAL_MEMBERSHIP_GATE_REQUIRED");
  }
  return Object.freeze({
    async read({dbPrincipal,binding,callback}) {
      const principal=requireAccountDbPrincipal(dbPrincipal);
      const issued=requireAccountCredentialBinding(binding);
      if (typeof callback !== "function" ||
          principal.principalId !== issued.principalId ||
          principal.roleName !== issued.roleName ||
          issued.environment !== "test") {
        throw new Error("ACCOUNT_CREDENTIAL_MEMBERSHIP_DENIED");
      }
      return epochGuard.execute({binding:issued,callback:async()=>{
        const before=await membershipGate.assertCurrent({
          dbPrincipal:principal,accountId:issued.accountId
        });
        if (!before || before.accountId !== issued.accountId ||
            before.viewEligible !== true ||
            before.financialExecutionEnabled !== false) {
          throw new Error("ACCOUNT_CREDENTIAL_MEMBERSHIP_DENIED");
        }
        const result=await callback(Object.freeze({
          principalId:issued.principalId,
          accountId:issued.accountId,
          tenantId:issued.tenantId,
          displayOnly:true,financialExecutionEnabled:false
        }));
        const after=await membershipGate.assertCurrent({
          dbPrincipal:principal,accountId:issued.accountId
        });
        if (!after || after.accountId !== issued.accountId ||
            after.viewEligible !== true ||
            after.financialExecutionEnabled !== false) {
          throw new Error("ACCOUNT_CREDENTIAL_MEMBERSHIP_DENIED");
        }
        return result;
      }});
    }
  });
}
