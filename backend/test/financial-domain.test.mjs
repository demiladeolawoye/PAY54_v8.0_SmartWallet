
"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
  OPERATION_STATES,
  TRANSITION_EVIDENCE,
  OperationTransitionError,
  allowedTransitions,
  assertOperationTransition,
  isTerminalOperationState
} from "../src/domain/financial-operation-state.mjs";

import {
  IdempotencyError,
  validateIdempotencyKey,
  digestFinancialRequest,
  resolveExistingIdempotencyRecord
} from "../src/domain/financial-idempotency.mjs";

const validKey = "pay54-operation-00001";

const owner =
  "11111111-1111-4111-8111-111111111111";

const request = {
  kind: "WALLET_TRANSFER",

  sourceWalletId:
    "22222222-2222-4222-8222-222222222222",

  amount: {
    currency: "NGN",
    minorUnits: "2500"
  },

  destination: {
    type: "WALLET",
    walletId:
      "33333333-3333-4333-8333-333333333333"
  }
};

test(
  "all operation states have explicit transition definitions",
  () => {
    assert.equal(OPERATION_STATES.length, 10);

    for (const state of OPERATION_STATES) {
      assert.ok(
        Array.isArray(allowedTransitions(state))
      );
    }
  }
);

test(
  "happy-path internal wallet settlement requires correct evidence types",
  () => {
    const flow = [
      [
        "RECEIVED",
        "VALIDATING",
        TRANSITION_EVIDENCE.VALIDATION_STARTED
      ],
      [
        "VALIDATING",
        "RESERVED",
        TRANSITION_EVIDENCE.RESERVATION_COMMITTED
      ],
      [
        "RESERVED",
        "SUBMITTED",
        TRANSITION_EVIDENCE.SUBMISSION_RECORDED
      ],
      [
        "SUBMITTED",
        "SETTLED",
        TRANSITION_EVIDENCE.SETTLEMENT_CONFIRMED
      ],
      [
        "SETTLED",
        "REVERSAL_PENDING",
        TRANSITION_EVIDENCE.REVERSAL_OPENED
      ],
      [
        "REVERSAL_PENDING",
        "REVERSED",
        TRANSITION_EVIDENCE.EXACT_REVERSAL_POSTED
      ]
    ];

    for (const [from, to, evidence] of flow) {
      assert.equal(
        assertOperationTransition(
          from,
          to,
          evidence
        ).nextState,
        to
      );
    }
  }
);

test(
  "unknown provider outcome cannot be resubmitted or marked settled without evidence",
  () => {
    assertOperationTransition(
      "SUBMITTED",
      "PROVIDER_UNKNOWN",
      TRANSITION_EVIDENCE
        .PROVIDER_OUTCOME_UNCERTAIN
    );

    assert.throws(
      () => assertOperationTransition(
        "PROVIDER_UNKNOWN",
        "SUBMITTED",
        TRANSITION_EVIDENCE.SUBMISSION_RECORDED
      ),
      error =>
        error instanceof OperationTransitionError &&
        error.code === "ILLEGAL_TRANSITION"
    );

    assert.throws(
      () => assertOperationTransition(
        "PROVIDER_UNKNOWN",
        "SETTLED",
        TRANSITION_EVIDENCE.SUBMISSION_RECORDED
      ),
      error =>
        error.code === "EVIDENCE_MISMATCH"
    );

    assertOperationTransition(
      "PROVIDER_UNKNOWN",
      "SETTLED",
      TRANSITION_EVIDENCE.SETTLEMENT_CONFIRMED
    );
  }
);

test(
  "rejected failed and reversed states are terminal",
  () => {
    for (
      const state of [
        "REJECTED",
        "FAILED",
        "REVERSED"
      ]
    ) {
      assert.equal(
        isTerminalOperationState(state),
        true
      );

      assert.equal(
        allowedTransitions(state).length,
        0
      );

      assert.throws(
        () => assertOperationTransition(
          state,
          "SUBMITTED",
          TRANSITION_EVIDENCE.SUBMISSION_RECORDED
        )
      );
    }

    assert.equal(
      isTerminalOperationState("SETTLED"),
      false
    );
  }
);

test(
  "illegal transitions no-ops and unknown states are rejected",
  () => {
    assert.throws(
      () => assertOperationTransition(
        "RECEIVED",
        "SETTLED",
        TRANSITION_EVIDENCE.SETTLEMENT_CONFIRMED
      ),
      error =>
        error.code === "ILLEGAL_TRANSITION"
    );

    assert.throws(
      () => assertOperationTransition(
        "SUBMITTED",
        "SUBMITTED",
        TRANSITION_EVIDENCE.SUBMISSION_RECORDED
      ),
      error =>
        error.code === "NO_OP_TRANSITION"
    );

    assert.throws(
      () => allowedTransitions("GUESSED"),
      error =>
        error.code === "UNKNOWN_STATE"
    );
  }
);

test(
  "idempotency key matches the OpenAPI header policy",
  () => {
    assert.equal(
      validateIdempotencyKey(validKey),
      validKey
    );

    for (
      const key of [
        "short",
        "spaces are invalid 0001",
        "a".repeat(129),
        17,
        null
      ]
    ) {
      assert.throws(
        () => validateIdempotencyKey(key),
        IdempotencyError
      );
    }
  }
);

test(
  "request digest is stable across JSON object key order changes",
  () => {
    const digest =
      digestFinancialRequest(request);

    const reordered = {
      destination: {
        walletId: request.destination.walletId,
        type: "WALLET"
      },

      amount: {
        minorUnits: "2500",
        currency: "NGN"
      },

      sourceWalletId: request.sourceWalletId,
      kind: request.kind
    };

    assert.match(
      digest,
      /^[0-9a-f]{64}$/
    );

    assert.equal(
      digestFinancialRequest(reordered),
      digest
    );

    assert.notEqual(
      digestFinancialRequest({
        ...request,

        amount: {
          currency: "NGN",
          minorUnits: "2501"
        }
      }),
      digest
    );

    assert.notEqual(
      digestFinancialRequest({
        ...request,

        amount: {
          currency: "GBP",
          minorUnits: "2500"
        }
      }),
      digest
    );
  }
);

test(
  "digest rejects invalid objects unsafe keys cycles floats and dates",
  () => {
    const cyclic = {};

    cyclic.self = cyclic;

    for (
      const body of [
        null,
        [],
        new Date(),
        cyclic,
        { amount: 0.1 },
        JSON.parse('{"__proto__":1}')
      ]
    ) {
      assert.throws(
        () => digestFinancialRequest(body),
        IdempotencyError
      );
    }
  }
);

test(
  "first idempotency attempt requests transactional claim, retry returns original",
  () => {
    const digest =
      digestFinancialRequest(request);

    const input = {
      authenticatedOwnerSubject: owner,
      idempotencyKey: validKey,
      requestDigest: digest
    };

    assert.deepEqual(
      resolveExistingIdempotencyRecord({
        ...input,
        existingRecord: null
      }),
      {
        kind: "CLAIM_REQUIRED"
      }
    );

    assert.deepEqual(
      resolveExistingIdempotencyRecord({
        ...input,

        existingRecord: {
          ownerSubject: owner,
          idempotencyKey: validKey,
          requestDigest: digest,
          operationId: "op-123"
        }
      }),
      {
        kind: "REPLAY",
        operationId: "op-123"
      }
    );
  }
);

test(
  "idempotency rejects altered request or owner scope",
  () => {
    const digest =
      digestFinancialRequest(request);

    const stored = {
      ownerSubject: owner,
      idempotencyKey: validKey,
      requestDigest: digest,
      operationId: "op-123"
    };

    assert.throws(
      () => resolveExistingIdempotencyRecord({
        authenticatedOwnerSubject: owner,
        idempotencyKey: validKey,

        requestDigest:
          digestFinancialRequest({
            ...request,
            quoteId: "changed"
          }),

        existingRecord: stored
      }),
      error =>
        error.code === "IDEMPOTENCY_CONFLICT"
    );

    assert.throws(
      () => resolveExistingIdempotencyRecord({
        authenticatedOwnerSubject:
          "another-owner",

        idempotencyKey: validKey,
        requestDigest: digest,
        existingRecord: stored
      }),
      error =>
        error.code === "IDEMPOTENCY_SCOPE_MISMATCH"
    );
  }
);
