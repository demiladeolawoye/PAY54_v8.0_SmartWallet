"use strict";

/**
 * PAY54 Batch 21 / 800 — strictly bounded, untrusted switch request parser.
 *
 * An account ID is only a requested destination, never proof of membership.
 * Whitelisting prevents callers from smuggling roles, identity, wallet
 * balances, previous session data, entitlement or synthetic Business status.
 * No account/session state is changed here.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const deny = () => { throw new Error("PAY54_ACCOUNT_SWITCH_REQUEST_INVALID"); };

export function parsePay54AccountSwitchRequest(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      Object.getPrototypeOf(payload) !== Object.prototype ||
      Object.keys(payload).length !== 1 ||
      !Object.hasOwn(payload, "requestedAccountId") ||
      typeof payload.requestedAccountId !== "string" ||
      !UUID.test(payload.requestedAccountId)) deny();

  return Object.freeze({
    schema: "pay54.account-switch-request.v1",
    requestedAccountId: payload.requestedAccountId.toLowerCase(),
    requiresServerMembershipAuthorisation: true,
    accountSwitchCompleted: false
  });
}
