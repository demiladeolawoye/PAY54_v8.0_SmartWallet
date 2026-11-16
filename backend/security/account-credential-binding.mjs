"use strict";
import {requireAccountDbPrincipal} from "./account-db-principal.mjs";
import {assessAccountCredentialCustody} from "./account-credential-custody-policy.mjs";

/*
 * PAY54 Batch 10 item 215. Source-only account/tenant credential mapping
 * boundary. Reviewer is responsible for loading its authoritative mapping
 * independently of request parameters. This does not authenticate the DB.
 */

export function createAccountCredentialBinding({loadAuthoritativeBinding}) {
  if (typeof loadAuthoritativeBinding !== "function") {
    throw new TypeError("ACCOUNT_CREDENTIAL_MAPPING_REQUIRED");
  }
  return Object.freeze({
    async verify({dbPrincipal, custodyEvidence, accountId, tenantId}) {
      const principal = requireAccountDbPrincipal(dbPrincipal);
      const custody = assessAccountCredentialCustody(custodyEvidence);
      if (typeof accountId !== "string" || typeof tenantId !== "string" ||
          custody.accountId !== accountId.toLowerCase() ||
          custody.tenantId !== tenantId.toLowerCase() ||
          custody.roleName !== principal.roleName) {
        throw new Error("ACCOUNT_CREDENTIAL_BINDING_DENIED");
      }
      const mapped = await loadAuthoritativeBinding(principal.principalId);
      if (!mapped || typeof mapped !== "object" ||
          mapped.subjectId !== principal.principalId ||
          mapped.accountId !== custody.accountId ||
          mapped.tenantId !== custody.tenantId ||
          mapped.roleName !== custody.roleName ||
          mapped.active !== true ||
          mapped.revoked !== false ||
          mapped.rotationEpoch !== custody.rotationEpoch) {
        throw new Error("ACCOUNT_CREDENTIAL_BINDING_DENIED");
      }
      return Object.freeze({
        principalId: principal.principalId,
        tenantId: custody.tenantId,
        accountId: custody.accountId,
        roleName: custody.roleName,
        rotationEpoch: custody.rotationEpoch,
        sourceMappingEligible: true,
        liveCredentialAttested: false,
        customerDataAccessEnabled: false,
        financialExecutionEnabled: false
      });
    }
  });
}
