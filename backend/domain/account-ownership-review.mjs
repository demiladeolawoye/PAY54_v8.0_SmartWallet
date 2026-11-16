"use strict";

import {requireAccountCredentialBinding} from "../security/account-credential-binding.mjs";
import {requireAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {assertTenantAccountAccess} from "./account-tenant-boundary.mjs";

/*
 * PAY54 Batch 10 item 228 — independently loaded ownership review.
 * The tenant/account association is an authoritative server-side assertion,
 * never taken from a client's account-selection intent. The existing
 * Personal/Business membership engine makes the permission decision.
 * This source-only contract cannot grant database access.
 */
export function createAccountOwnershipReview({loadCurrentAccountContext}={}) {
  if (typeof loadCurrentAccountContext !== "function") {
    throw new TypeError("ACCOUNT_OWNER_CONTEXT_SOURCE_REQUIRED");
  }
  return Object.freeze({
    async review({dbPrincipal,binding}) {
      const principal=requireAccountDbPrincipal(dbPrincipal);
      const issued=requireAccountCredentialBinding(binding);
      if (principal.principalId!==issued.principalId ||
          principal.roleName!==issued.roleName ||
          issued.environment!=="test") {
        throw new Error("ACCOUNT_OWNER_CONTEXT_DENIED");
      }
      let context;
      try {
        context=await loadCurrentAccountContext({
          principalId:principal.principalId,
          accountId:issued.accountId
        });
      } catch {
        throw new Error("ACCOUNT_OWNER_CONTEXT_UNAVAILABLE");
      }
      if (!context || typeof context!=="object" ||
          context.tenantId!==issued.tenantId ||
          context.account?.accountId?.toLowerCase()!==issued.accountId ||
          !["PERSONAL","BUSINESS"].includes(context.account?.type)) {
        throw new Error("ACCOUNT_OWNER_CONTEXT_DENIED");
      }
      try {
        const decision=assertTenantAccountAccess({
          principalId:principal.principalId,
          requestedAccountId:issued.accountId,
          account:context.account,
          membership:context.membership
        });
        if (decision.viewEligible!==true ||
            decision.financialExecutionEnabled!==false) {
          throw new Error("ACCOUNT_OWNER_CONTEXT_DENIED");
        }
        return Object.freeze({
          accountId:issued.accountId,
          accountType:context.account.type,
          viewEligible:true,
          sessionSwitched:false,
          customerDataAccessEnabled:false,
          financialExecutionEnabled:false
        });
      } catch {
        throw new Error("ACCOUNT_OWNER_CONTEXT_DENIED");
      }
    }
  });
}
