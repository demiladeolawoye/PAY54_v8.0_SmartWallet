"use strict";
import {requireAccountCredentialBinding} from "./account-credential-binding.mjs";

/*
 * Batch 10 item 221. Source-only freshness envelope for one test-operation.
 * Requires a separately trusted authoritative epoch reader. This module does
 * not connect to a database, invalidate credentials or attest live custody.
 * Caller MUST also enforce principal membership, audit and DB RLS independently.
 */
export function createAccountCredentialEpochGuard({loadCurrentCredentialState}) {
  if (typeof loadCurrentCredentialState !== "function") {
    throw new TypeError("ACCOUNT_EPOCH_READER_REQUIRED");
  }
  async function check(binding) {
    const issued=requireAccountCredentialBinding(binding);
    const current=await loadCurrentCredentialState({
      principalId:issued.principalId,
      tenantId:issued.tenantId,
      accountId:issued.accountId
    });
    if (!current || typeof current !== "object" ||
        current.active !== true || current.revoked !== false ||
        current.principalId !== issued.principalId ||
        current.tenantId !== issued.tenantId ||
        current.accountId !== issued.accountId ||
        current.roleName !== issued.roleName ||
        current.endpointId !== issued.endpointId ||
        current.rotationEpoch !== issued.rotationEpoch) {
      throw new Error("ACCOUNT_CREDENTIAL_EPOCH_STALE");
    }
    return issued;
  }
  return Object.freeze({
    async execute({binding,callback}) {
      if (typeof callback !== "function") {
        throw new TypeError("ACCOUNT_EPOCH_CALLBACK_REQUIRED");
      }
      const issued=await check(binding);
      const result=await callback(issued);
      await check(issued);
      return result;
    }
  });
}
