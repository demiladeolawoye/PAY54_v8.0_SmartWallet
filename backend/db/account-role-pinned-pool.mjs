"use strict";
import {requireAccountCredentialBinding} from "../security/account-credential-binding.mjs";

/*
 * Batch 10 item 219 — source-only, TEST ENVIRONMENT ONLY.
 * This contract checks checkout/discard and per-role pinning using injected
 * mock clients. It MUST NOT be mounted as a production PostgreSQL connector.
 * Neither callback can establish trusted network or credential provenance.
 */
export function createAccountRolePinnedPool({connectForBinding,reviewConnection}) {
  if (typeof connectForBinding !== "function" ||
      typeof reviewConnection !== "function") {
    throw new TypeError("ACCOUNT_PINNED_POOL_REVIEW_REQUIRED");
  }
  const checkedOut=new WeakSet();
  return Object.freeze({
    async withClient({binding,callback}) {
      const issued=requireAccountCredentialBinding(binding);
      if (issued.environment !== "test" ||
          typeof callback !== "function") {
        throw new Error("ACCOUNT_PINNED_POOL_DENIED");
      }
      const client=await connectForBinding(issued);
      if (!client || typeof client !== "object" ||
          typeof client.query !== "function" ||
          typeof client.release !== "function") {
        throw new Error("ACCOUNT_PINNED_POOL_CLIENT_INVALID");
      }
      // Never release someone else's active checkout.
      if (checkedOut.has(client)) {
        throw new Error("ACCOUNT_PINNED_POOL_CLIENT_SHARED");
      }
      checkedOut.add(client);
      let discard=true;
      try {
        const observed=await reviewConnection(client,issued);
        if (!observed || typeof observed !== "object" ||
            observed.sessionUser !== issued.roleName ||
            observed.currentUser !== issued.roleName ||
            observed.rotationEpoch !== issued.rotationEpoch ||
            observed.endpointId !== issued.endpointId ||
            observed.financialPrivilegeAbsent !== true ||
            observed.nonSwitchable === false) {
          throw new Error("ACCOUNT_PINNED_POOL_ACTOR_MISMATCH");
        }
        const value=await callback(client);
        // A second review catches role/credential changes during checkout.
        const after=await reviewConnection(client,issued);
        if (!after || typeof after !== "object" ||
            after.sessionUser !== issued.roleName ||
            after.currentUser !== issued.roleName ||
            after.rotationEpoch !== issued.rotationEpoch ||
            after.endpointId !== issued.endpointId ||
            after.financialPrivilegeAbsent !== true ||
            after.nonSwitchable === false) {
          throw new Error("ACCOUNT_PINNED_POOL_ACTOR_CHANGED");
        }
        discard=false;
        return value;
      } finally {
        checkedOut.delete(client);
        // The source-only contract cannot guarantee session reset, so always
        // discard physical connections even on the success path.
        client.release(true);
      }
    }
  });
}
