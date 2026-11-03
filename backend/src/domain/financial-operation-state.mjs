
"use strict";

/**
 * PAY54 financial-operation lifecycle policy v1.0.0.
 *
 * Pure domain validation only.
 *
 * Never writes to a ledger, calls a provider, changes an
 * operation in a database, or proves an external event occurred.
 *
 * The trusted service must verify evidence and persist state,
 * journal references and outbox events atomically.
 */

export const OPERATION_STATES = Object.freeze([
  "RECEIVED",
  "VALIDATING",
  "REJECTED",
  "RESERVED",
  "SUBMITTED",
  "PROVIDER_UNKNOWN",
  "SETTLED",
  "FAILED",
  "REVERSAL_PENDING",
  "REVERSED"
]);

export const TRANSITION_EVIDENCE = Object.freeze({
  VALIDATION_STARTED:
    "VALIDATION_STARTED",

  VALIDATION_REJECTED:
    "VALIDATION_REJECTED",

  RESERVATION_COMMITTED:
    "RESERVATION_COMMITTED",

  SUBMISSION_RECORDED:
    "SUBMISSION_RECORDED",

  PROVIDER_OUTCOME_UNCERTAIN:
    "PROVIDER_OUTCOME_UNCERTAIN",

  SETTLEMENT_CONFIRMED:
    "SETTLEMENT_CONFIRMED",

  FAILURE_CONFIRMED_AND_RESERVATION_RELEASED:
    "FAILURE_CONFIRMED_AND_RESERVATION_RELEASED",

  REVERSAL_OPENED:
    "REVERSAL_OPENED",

  EXACT_REVERSAL_POSTED:
    "EXACT_REVERSAL_POSTED"
});

const RULES = Object.freeze({
  RECEIVED: Object.freeze({
    VALIDATING:
      TRANSITION_EVIDENCE.VALIDATION_STARTED
  }),

  VALIDATING: Object.freeze({
    REJECTED:
      TRANSITION_EVIDENCE.VALIDATION_REJECTED,

    RESERVED:
      TRANSITION_EVIDENCE.RESERVATION_COMMITTED
  }),

  REJECTED: Object.freeze({}),

  RESERVED: Object.freeze({
    SUBMITTED:
      TRANSITION_EVIDENCE.SUBMISSION_RECORDED,

    FAILED:
      TRANSITION_EVIDENCE
        .FAILURE_CONFIRMED_AND_RESERVATION_RELEASED
  }),

  SUBMITTED: Object.freeze({
    PROVIDER_UNKNOWN:
      TRANSITION_EVIDENCE.PROVIDER_OUTCOME_UNCERTAIN,

    SETTLED:
      TRANSITION_EVIDENCE.SETTLEMENT_CONFIRMED,

    FAILED:
      TRANSITION_EVIDENCE
        .FAILURE_CONFIRMED_AND_RESERVATION_RELEASED
  }),

  PROVIDER_UNKNOWN: Object.freeze({
    SETTLED:
      TRANSITION_EVIDENCE.SETTLEMENT_CONFIRMED,

    FAILED:
      TRANSITION_EVIDENCE
        .FAILURE_CONFIRMED_AND_RESERVATION_RELEASED
  }),

  SETTLED: Object.freeze({
    REVERSAL_PENDING:
      TRANSITION_EVIDENCE.REVERSAL_OPENED
  }),

  FAILED: Object.freeze({}),

  REVERSAL_PENDING: Object.freeze({
    REVERSED:
      TRANSITION_EVIDENCE.EXACT_REVERSAL_POSTED
  }),

  REVERSED: Object.freeze({})
});

const STATE_SET = new Set(OPERATION_STATES);

const EVIDENCE_SET = new Set(
  Object.values(TRANSITION_EVIDENCE)
);

export class OperationTransitionError extends Error {
  constructor(code, message) {
    super(message);

    this.name = "OperationTransitionError";
    this.code = code;
  }
}

export function allowedTransitions(currentState) {
  if (!STATE_SET.has(currentState)) {
    throw new OperationTransitionError(
      "UNKNOWN_STATE",
      "Unknown financial operation state"
    );
  }

  return Object.freeze(
    Object.keys(RULES[currentState])
  );
}

/**
 * Validate a requested state change and asserted evidence category.
 *
 * Evidence categories are NOT proof.
 * Only trusted backend code may supply them after independently
 * verifying provider outcomes, ledger postings and reservation
 * consistency within a durable database transaction.
 */
export function assertOperationTransition(
  currentState,
  nextState,
  evidenceType
) {
  if (
    !STATE_SET.has(currentState) ||
    !STATE_SET.has(nextState)
  ) {
    throw new OperationTransitionError(
      "UNKNOWN_STATE",
      "Unknown financial operation state"
    );
  }

  if (currentState === nextState) {
    throw new OperationTransitionError(
      "NO_OP_TRANSITION",
      "State changes must advance the lifecycle"
    );
  }

  const requiredEvidence =
    RULES[currentState][nextState];

  if (!requiredEvidence) {
    throw new OperationTransitionError(
      "ILLEGAL_TRANSITION",
      `Transition ${currentState} -> ${nextState} is forbidden`
    );
  }

  if (
    !EVIDENCE_SET.has(evidenceType) ||
    evidenceType !== requiredEvidence
  ) {
    throw new OperationTransitionError(
      "EVIDENCE_MISMATCH",
      `Transition ${currentState} -> ${nextState} requires ${requiredEvidence}`
    );
  }

  return Object.freeze({
    currentState,
    nextState,
    requiredEvidence
  });
}

export function isTerminalOperationState(state) {
  if (!STATE_SET.has(state)) {
    throw new OperationTransitionError(
      "UNKNOWN_STATE",
      "Unknown financial operation state"
    );
  }

  return (
    state === "REJECTED" ||
    state === "FAILED" ||
    state === "REVERSED"
  );
}
