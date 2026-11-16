"use strict";
import {requireAccountDbPrincipal} from "./account-db-principal.mjs";
import {assessAccountCredentialCustody} from "./account-credential-custody-policy.mjs";

/*
 * PAY54 Batch 10 items 215 and 217.
 * Source-only account/tenant credential mapping boundary. The authoritative
 * loader is injected by a separately trusted server component, never a client.
 * This descriptor does not prove PostgreSQL authentication or permit reads.
 */
const issued = new WeakSet();

export function requireAccountCredentialBinding(value) {
  if (!value || typeof value !== "object" || !issued.has(value)) {
    throw new Error("ACCOUNT_CREDENTIAL_BINDING_DENIED");
  }
  return value;
}

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
      const descriptor = Object.freeze({
        principalId: principal.principalId,
        tenantId: custody.tenantId,
        accountId: custody.accountId,
        roleName: custody.roleName,
        rotationEpoch: custody.rotationEpoch,
        endpointId: custody.endpointId,
        environment: custody.environment,
        sourceMappingEligible: true,
        liveCredentialAttested: false,
        customerDataAccessEnabled: false,
        financialExecutionEnabled: false
      });
      issued.add(descriptor);
      return descriptor;
    }
  });
}
