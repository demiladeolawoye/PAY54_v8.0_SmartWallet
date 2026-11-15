"use strict";

/* PAY54 Batch 01 — non-activating account-switcher UX contract.
 * Does not read session storage, create account state or switch ledger views. */

export const PAY54_SWITCHER_CONTRACT = Object.freeze({
  version: "1.0.0",
  roles: Object.freeze(["menu", "menuitem"]),
  triggerLabel: "Switch account",
  accountTypes: Object.freeze(["PERSONAL", "BUSINESS"]),
  requirements: Object.freeze([
    "A real switcher must retrieve the authenticated list of accounts from the backend",
    "Account selection must be authorised server-side on every data request",
    "All visible balance, transaction, card and recipient views must be scoped to selected account",
    "Pending and suspended accounts must not present enabled payment actions",
    "Keyboard focus must be managed when opening, selecting, dismissing and closing the menu",
    "Escape closes the menu and returns focus to the trigger",
    "The selected account must be announced to assistive technologies",
    "The interface must not claim a Business wallet exists merely from a visible menu label"
  ]),
  previewExecutionEnabled: false,
  enabledByPresentation: false,
  switchingEnabled: false,
  businessAccountProvisioningEnabled: false
});

export function getAccountSwitcherCandidate(selectedAccountId) {
  if (typeof selectedAccountId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(selectedAccountId)) return null;
  return Object.freeze({
    selectedAccountId: selectedAccountId.toLowerCase(),
    requiresBackendMembershipVerification: true,
    pendingServerAuthorisation: true,
    executed: false
  });
}
