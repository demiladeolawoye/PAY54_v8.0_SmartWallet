
"use strict";

/**
 * PAY54 Trusted Posting Contract v1.0.0
 * Work Package: WP-P54-BACKEND-001G.5A
 *
 * Produces a non-executable internal wallet transfer posting plan
 * from database-shaped evidence supplied by a trusted backend.
 *
 * SECURITY:
 * This module does not authenticate callers, access PostgreSQL,
 * hold locks, verify evidence provenance, authorise payments,
 * post journals or grant privileges.
 *
 * Never pass browser-submitted financial evidence directly here.
 */

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CURRENCY = /^[A-Z]{3}$/;
const MINOR_UNITS = /^[1-9][0-9]{0,17}$/;
const KEY = /^[A-Za-z0-9._:-]{16,128}$/;
const DIGEST = /^[0-9a-f]{64}$/;

export const POSTING_PLAN_VERSION = "1.0.0";

export class PostingContractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PostingContractError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new PostingContractError(code, message);
}

function record(value, name, keys) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null
    )
  ) {
    fail(
      "INVALID_RECORD",
      `${name} must be a plain object`
    );
  }

  for (const key of keys) {
    if (!Object.hasOwn(value, key)) {
      fail(
        "MISSING_FIELD",
        `${name}.${key} is required`
      );
    }
  }

  return value;
}

function requireMatch(value, expression, name) {
  if (
    typeof value !== "string" ||
    !expression.test(value)
  ) {
    fail(
      "INVALID_FIELD",
      `${name} has an invalid format`
    );
  }

  return value;
}

function same(actual, expected, code, label) {
  if (actual !== expected) {
    fail(code, `${label} does not match`);
  }
}

function deepFreeze(value) {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }

    Object.freeze(value);
  }

  return value;
}

/**
 * Build a posting plan.
 *
 * Every input must have been read or established by the trusted
 * financial service within a controlled database transaction.
 *
 * Input validation is not proof of trustworthy provenance.
 */
export function buildInternalTransferPostingPlan(input) {
  record(input, "input", [
    "operation",
    "reservation",
    "sourceAccount",
    "destinationAccount",
    "idempotencyRecord",
    "authorizationDecision"
  ]);

  const op = record(input.operation, "operation", [
    "id",
    "ownerSubject",
    "kind",
    "state",
    "currency",
    "amountMinor",
    "sourceWalletId",
    "destinationWalletId"
  ]);

  const hold = record(input.reservation, "reservation", [
    "operationId",
    "accountId",
    "currency",
    "amountMinor",
    "status"
  ]);

  const source = record(
    input.sourceAccount,
    "sourceAccount",
    [
      "id",
      "walletId",
      "currency",
      "accountClass",
      "status"
    ]
  );

  const destination = record(
    input.destinationAccount,
    "destinationAccount",
    [
      "id",
      "walletId",
      "currency",
      "accountClass",
      "status"
    ]
  );

  const idem = record(
    input.idempotencyRecord,
    "idempotencyRecord",
    [
      "operationId",
      "ownerSubject",
      "key",
      "requestDigest"
    ]
  );

  const auth = record(
    input.authorizationDecision,
    "authorizationDecision",
    [
      "id",
      "ownerSubject",
      "operationId",
      "scope",
      "result"
    ]
  );

  const identities = {
    operationId: op.id,
    ownerSubject: op.ownerSubject,
    sourceWalletId: op.sourceWalletId,
    destinationWalletId: op.destinationWalletId,
    reservationOperationId: hold.operationId,
    reservationAccountId: hold.accountId,
    sourceAccountId: source.id,
    sourceAccountWalletId: source.walletId,
    destinationAccountId: destination.id,
    destinationAccountWalletId: destination.walletId,
    idempotencyOperationId: idem.operationId,
    idempotencyOwner: idem.ownerSubject,
    authorizationId: auth.id,
    authorizationOwner: auth.ownerSubject,
    authorizationOperationId: auth.operationId
  };

  for (const [name, id] of Object.entries(identities)) {
    requireMatch(id, UUID, name);
  }

  requireMatch(op.currency, CURRENCY, "operation.currency");
  requireMatch(
    hold.currency,
    CURRENCY,
    "reservation.currency"
  );
  requireMatch(
    source.currency,
    CURRENCY,
    "sourceAccount.currency"
  );
  requireMatch(
    destination.currency,
    CURRENCY,
    "destinationAccount.currency"
  );

  requireMatch(
    op.amountMinor,
    MINOR_UNITS,
    "operation.amountMinor"
  );
  requireMatch(
    hold.amountMinor,
    MINOR_UNITS,
    "reservation.amountMinor"
  );

  requireMatch(
    idem.key,
    KEY,
    "idempotencyRecord.key"
  );
  requireMatch(
    idem.requestDigest,
    DIGEST,
    "idempotencyRecord.requestDigest"
  );

  same(
    op.kind,
    "WALLET_TRANSFER",
    "WRONG_OPERATION_KIND",
    "Operation kind"
  );

  same(
    op.state,
    "RESERVED",
    "NOT_RESERVED",
    "Operation state"
  );

  same(
    hold.status,
    "HELD",
    "NOT_HELD",
    "Reservation state"
  );

  same(
    source.accountClass,
    "CUSTOMER_LIABILITY",
    "WRONG_ACCOUNT_CLASS",
    "Source account class"
  );

  same(
    destination.accountClass,
    "CUSTOMER_LIABILITY",
    "WRONG_ACCOUNT_CLASS",
    "Destination account class"
  );

  same(
    source.status,
    "OPEN",
    "ACCOUNT_NOT_OPEN",
    "Source account status"
  );

  same(
    destination.status,
    "OPEN",
    "ACCOUNT_NOT_OPEN",
    "Destination account status"
  );

  same(
    auth.scope,
    "wallet.transfer.capture",
    "INVALID_AUTHORIZATION",
    "Authorization scope"
  );

  same(
    auth.result,
    "ALLOW",
    "INVALID_AUTHORIZATION",
    "Authorization decision"
  );

  same(
    hold.operationId,
    op.id,
    "OPERATION_MISMATCH",
    "Reservation operation"
  );

  same(
    idem.operationId,
    op.id,
    "OPERATION_MISMATCH",
    "Idempotency operation"
  );

  same(
    auth.operationId,
    op.id,
    "OPERATION_MISMATCH",
    "Authorization operation"
  );

  same(
    idem.ownerSubject,
    op.ownerSubject,
    "OWNER_MISMATCH",
    "Idempotency owner"
  );

  same(
    auth.ownerSubject,
    op.ownerSubject,
    "OWNER_MISMATCH",
    "Authorization owner"
  );

  same(
    hold.accountId,
    source.id,
    "ACCOUNT_MISMATCH",
    "Reserved account"
  );

  same(
    source.walletId,
    op.sourceWalletId,
    "WALLET_MISMATCH",
    "Source wallet"
  );

  same(
    destination.walletId,
    op.destinationWalletId,
    "WALLET_MISMATCH",
    "Destination wallet"
  );

  for (const [name, currency] of [
    ["hold", hold.currency],
    ["source", source.currency],
    ["destination", destination.currency]
  ]) {
    same(
      currency,
      op.currency,
      "CURRENCY_MISMATCH",
      `${name} currency`
    );
  }

  same(
    hold.amountMinor,
    op.amountMinor,
    "AMOUNT_MISMATCH",
    "Reserved amount"
  );

  if (
    op.sourceWalletId === op.destinationWalletId ||
    source.id === destination.id
  ) {
    fail(
      "SELF_TRANSFER",
      "Source and destination must be distinct"
    );
  }

  // Never use floating-point arithmetic for monetary posting.
  const amount = BigInt(op.amountMinor);

  const entries = [
    {
      accountId: source.id,
      currency: op.currency,
      amountMinor: (-amount).toString()
    },
    {
      accountId: destination.id,
      currency: op.currency,
      amountMinor: amount.toString()
    }
  ];

  const balance = entries.reduce(
    (sum, entry) => sum + BigInt(entry.amountMinor),
    0n
  );

  if (balance !== 0n) {
    fail(
      "UNBALANCED_PLAN",
      "Posting plan is not balanced"
    );
  }

  return deepFreeze({
    version: POSTING_PLAN_VERSION,
    kind: "INTERNAL_WALLET_TRANSFER",
    operationId: op.id,
    ownerSubject: op.ownerSubject,
    currency: op.currency,
    amountMinor: op.amountMinor,
    reservationOperationId: hold.operationId,
    idempotencyKey: idem.key,
    requestDigest: idem.requestDigest,
    authorizationDecisionId: auth.id,
    journalType: "TRANSFER",
    entries,
    requiredTransactionalChecks: [
      "VERIFY_AUTHENTICATION_AND_AUTHORIZATION_PROVENANCE",
      "LOCK_OPERATION_AND_BOTH_ACCOUNTS",
      "VERIFY_CURRENT_POSTED_BALANCES_AND_HELD_RESERVATION",
      "VERIFY_NO_PRIOR_TRANSFER_JOURNAL_OR_PROVIDER_ATTEMPT",
      "POST_BALANCED_JOURNAL_AND_CAPTURE_RESERVATION_ATOMICALLY",
      "PERSIST_SETTLED_STATE_AND_OUTBOX_EVENT_IN_SAME_TRANSACTION"
    ]
  });
}
