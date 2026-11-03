
"use strict";

/**
 * PAY54 Trusted Posting Contract Tests v1.0.0
 * Work Package: WP-P54-BACKEND-001G.5A
 *
 * Pure unit tests. No PostgreSQL access and no financial execution.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  POSTING_PLAN_VERSION,
  PostingContractError,
  buildInternalTransferPostingPlan
} from "../src/domain/trusted-posting-contract.mjs";

const IDs = Object.freeze({
  operation: "11111111-1111-4111-8111-111111111111",
  owner: "22222222-2222-4222-8222-222222222222",
  sourceWallet: "33333333-3333-4333-8333-333333333333",
  destWallet: "44444444-4444-4444-8444-444444444444",
  sourceAccount: "55555555-5555-4555-8555-555555555555",
  destAccount: "66666666-6666-4666-8666-666666666666",
  auth: "77777777-7777-4777-8777-777777777777"
});

function fixture() {
  return {
    operation: {
      id: IDs.operation,
      ownerSubject: IDs.owner,
      kind: "WALLET_TRANSFER",
      state: "RESERVED",
      currency: "NGN",
      amountMinor: "6000",
      sourceWalletId: IDs.sourceWallet,
      destinationWalletId: IDs.destWallet
    },

    reservation: {
      operationId: IDs.operation,
      accountId: IDs.sourceAccount,
      currency: "NGN",
      amountMinor: "6000",
      status: "HELD"
    },

    sourceAccount: {
      id: IDs.sourceAccount,
      walletId: IDs.sourceWallet,
      currency: "NGN",
      accountClass: "CUSTOMER_LIABILITY",
      status: "OPEN"
    },

    destinationAccount: {
      id: IDs.destAccount,
      walletId: IDs.destWallet,
      currency: "NGN",
      accountClass: "CUSTOMER_LIABILITY",
      status: "OPEN"
    },

    idempotencyRecord: {
      operationId: IDs.operation,
      ownerSubject: IDs.owner,
      key: "pay54-posting-test-0001",
      requestDigest: "a".repeat(64)
    },

    authorizationDecision: {
      id: IDs.auth,
      ownerSubject: IDs.owner,
      operationId: IDs.operation,
      scope: "wallet.transfer.capture",
      result: "ALLOW"
    }
  };
}

function rejected(input, code) {
  assert.throws(
    () => buildInternalTransferPostingPlan(input),
    error =>
      error instanceof PostingContractError &&
      error.code === code
  );
}

test(
  "produces an immutable, balanced, two-entry plan without executing",
  () => {
    const plan = buildInternalTransferPostingPlan(
      fixture()
    );

    assert.equal(plan.version, POSTING_PLAN_VERSION);

    assert.equal(
      plan.kind,
      "INTERNAL_WALLET_TRANSFER"
    );

    assert.deepEqual(plan.entries, [
      {
        accountId: IDs.sourceAccount,
        currency: "NGN",
        amountMinor: "-6000"
      },
      {
        accountId: IDs.destAccount,
        currency: "NGN",
        amountMinor: "6000"
      }
    ]);

    assert.equal(
      plan.entries.reduce(
        (sum, entry) =>
          sum + BigInt(entry.amountMinor),
        0n
      ),
      0n
    );

    assert.ok(Object.isFrozen(plan));
    assert.ok(Object.isFrozen(plan.entries));
    assert.ok(Object.isFrozen(plan.entries[0]));

    assert.equal(
      plan.requiredTransactionalChecks.length,
      6
    );
  }
);

test(
  "rejects malformed and missing evidence",
  () => {
    rejected(null, "INVALID_RECORD");

    const f = fixture();
    delete f.reservation;

    rejected(f, "MISSING_FIELD");
  }
);

test(
  "rejects non-reserved operations and non-held reservations",
  () => {
    const f = fixture();
    f.operation.state = "SETTLED";

    rejected(f, "NOT_RESERVED");

    const g = fixture();
    g.reservation.status = "RELEASED";

    rejected(g, "NOT_HELD");
  }
);

test(
  "rejects non-wallet-transfer kinds",
  () => {
    const f = fixture();
    f.operation.kind = "BANK_PAYOUT";

    rejected(f, "WRONG_OPERATION_KIND");
  }
);

test(
  "rejects account/operation/reservation identity mismatches",
  () => {
    const f = fixture();
    f.reservation.accountId = IDs.destAccount;

    rejected(f, "ACCOUNT_MISMATCH");

    const g = fixture();
    g.reservation.operationId = IDs.auth;

    rejected(g, "OPERATION_MISMATCH");

    const h = fixture();
    h.destinationAccount.walletId = IDs.sourceWallet;

    rejected(h, "WALLET_MISMATCH");
  }
);

test(
  "rejects mismatched amount and currency",
  () => {
    const f = fixture();
    f.reservation.amountMinor = "6001";

    rejected(f, "AMOUNT_MISMATCH");

    const g = fixture();
    g.destinationAccount.currency = "GBP";

    rejected(g, "CURRENCY_MISMATCH");
  }
);

test(
  "rejects invalid minor units including zero and floats",
  () => {
    for (const amount of [
      "0",
      "6.00",
      "-5",
      "01",
      6000,
      "1".repeat(19)
    ]) {
      const f = fixture();
      f.operation.amountMinor = amount;

      rejected(f, "INVALID_FIELD");
    }
  }
);

test(
  "rejects closed accounts or unsuitable account classes",
  () => {
    const f = fixture();
    f.sourceAccount.status = "FROZEN";

    rejected(f, "ACCOUNT_NOT_OPEN");

    const g = fixture();
    g.destinationAccount.accountClass = "SETTLEMENT";

    rejected(g, "WRONG_ACCOUNT_CLASS");
  }
);

test(
  "rejects unbound idempotency and authorization decisions",
  () => {
    const f = fixture();
    f.idempotencyRecord.ownerSubject = IDs.auth;

    rejected(f, "OWNER_MISMATCH");

    const g = fixture();
    g.authorizationDecision.scope =
      "wallet.transfer.create";

    rejected(g, "INVALID_AUTHORIZATION");

    const h = fixture();
    h.authorizationDecision.result = "DENY";

    rejected(h, "INVALID_AUTHORIZATION");
  }
);

test(
  "rejects source-to-self transfers",
  () => {
    const f = fixture();

    f.operation.destinationWalletId =
      IDs.sourceWallet;

    f.destinationAccount.walletId =
      IDs.sourceWallet;

    rejected(f, "SELF_TRANSFER");
  }
);

test(
  "rejects invalid UUIDs, hashes, and idempotency keys",
  () => {
    const f = fixture();
    f.operation.id = "not-a-uuid";

    rejected(f, "INVALID_FIELD");

    const g = fixture();
    g.idempotencyRecord.requestDigest = "abcd";

    rejected(g, "INVALID_FIELD");

    const h = fixture();
    h.idempotencyRecord.key = "short";

    rejected(h, "INVALID_FIELD");
  }
);

test(
  "handles maximum permitted positive minor units with bigint precision",
  () => {
    const f = fixture();

    f.operation.amountMinor = "999999999999999999";
    f.reservation.amountMinor = f.operation.amountMinor;

    const plan = buildInternalTransferPostingPlan(f);

    assert.equal(
      plan.entries[0].amountMinor,
      "-999999999999999999"
    );

    assert.equal(
      plan.entries[1].amountMinor,
      "999999999999999999"
    );
  }
);
