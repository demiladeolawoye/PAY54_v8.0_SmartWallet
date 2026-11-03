
"use strict";

import {
  createHash,
  timingSafeEqual
} from "node:crypto";

/**
 * PAY54 financial request idempotency policy v1.0.0.
 *
 * Pure input validation, canonical hashing and stored-record comparison.
 *
 * No database claim or payment execution is performed here.
 *
 * The backend must enforce:
 * UNIQUE(owner_subject, idempotency_key)
 * using an atomic transactional claim.
 */

const KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;

const DIGEST_PATTERN = /^[0-9a-f]{64}$/;

const OWN = (obj, key) =>
  Object.hasOwn(obj, key);

export class IdempotencyError extends Error {
  constructor(code, message) {
    super(message);

    this.name = "IdempotencyError";
    this.code = code;
  }
}

export function validateIdempotencyKey(key) {
  if (
    typeof key !== "string" ||
    !KEY_PATTERN.test(key)
  ) {
    throw new IdempotencyError(
      "INVALID_IDEMPOTENCY_KEY",
      "Idempotency-Key must contain 16–128 permitted ASCII characters"
    );
  }

  return key;
}

function canonical(value, seen = new Set()) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (
      !Number.isFinite(value) ||
      !Number.isSafeInteger(value)
    ) {
      throw new IdempotencyError(
        "INVALID_REQUEST_VALUE",
        "Financial request numbers must be safe integers; monetary amounts must be decimal strings"
      );
    }

    return JSON.stringify(value);
  }

  if (
    typeof value !== "object" ||
    seen.has(value)
  ) {
    throw new IdempotencyError(
      "INVALID_REQUEST_VALUE",
      "Unsupported or cyclic financial request value"
    );
  }

  const prototype = Object.getPrototypeOf(value);

  if (
    !Array.isArray(value) &&
    prototype !== Object.prototype &&
    prototype !== null
  ) {
    throw new IdempotencyError(
      "INVALID_REQUEST_VALUE",
      "Financial request must contain plain JSON objects only"
    );
  }

  seen.add(value);

  let result;

  try {
    if (Array.isArray(value)) {
      if (
        Object.keys(value).length !== value.length
      ) {
        throw new IdempotencyError(
          "INVALID_REQUEST_VALUE",
          "Financial request arrays cannot have sparse elements or extra properties"
        );
      }

      result =
        `[${value.map(
          item => canonical(item, seen)
        ).join(",")}]`;
    } else {
      const keys = Object.keys(value).sort();

      result =
        `{${keys.map(key => {
          if (
            [
              "__proto__",
              "constructor",
              "prototype"
            ].includes(key)
          ) {
            throw new IdempotencyError(
              "INVALID_REQUEST_VALUE",
              "Unsafe financial request field"
            );
          }

          return (
            `${JSON.stringify(key)}:` +
            canonical(value[key], seen)
          );
        }).join(",")}}`;
    }
  } finally {
    seen.delete(value);
  }

  return result;
}

export function digestFinancialRequest(request) {
  if (
    request === null ||
    Array.isArray(request) ||
    typeof request !== "object"
  ) {
    throw new IdempotencyError(
      "INVALID_REQUEST_VALUE",
      "Financial request must be a JSON object"
    );
  }

  // Canonical hashing does not replace OpenAPI/schema validation.
  return createHash("sha256")
    .update(canonical(request), "utf8")
    .digest("hex");
}

/**
 * Compare a trusted, previously stored idempotency record
 * with an authenticated retry.
 *
 * Owner identity must come from verified authentication,
 * never a client-provided owner field.
 *
 * A missing record must be atomically claimed by the future
 * database repository. This module never creates that claim.
 */
export function resolveExistingIdempotencyRecord({
  authenticatedOwnerSubject,
  idempotencyKey,
  requestDigest,
  existingRecord
}) {
  validateIdempotencyKey(idempotencyKey);

  if (
    typeof authenticatedOwnerSubject !== "string" ||
    !authenticatedOwnerSubject
  ) {
    throw new IdempotencyError(
      "INVALID_OWNER",
      "A verified owner subject is required"
    );
  }

  if (
    typeof requestDigest !== "string" ||
    !DIGEST_PATTERN.test(requestDigest)
  ) {
    throw new IdempotencyError(
      "INVALID_REQUEST_DIGEST",
      "A SHA-256 request digest is required"
    );
  }

  if (existingRecord == null) {
    return Object.freeze({
      kind: "CLAIM_REQUIRED"
    });
  }

  if (
    typeof existingRecord !== "object" ||
    !OWN(existingRecord, "ownerSubject") ||
    !OWN(existingRecord, "idempotencyKey") ||
    !OWN(existingRecord, "requestDigest") ||
    !OWN(existingRecord, "operationId")
  ) {
    throw new IdempotencyError(
      "INVALID_STORED_RECORD",
      "Stored idempotency record is incomplete"
    );
  }

  if (
    existingRecord.ownerSubject !==
      authenticatedOwnerSubject ||
    existingRecord.idempotencyKey !==
      idempotencyKey
  ) {
    throw new IdempotencyError(
      "IDEMPOTENCY_SCOPE_MISMATCH",
      "Stored record does not belong to authenticated idempotency scope"
    );
  }

  if (
    typeof existingRecord.requestDigest !== "string" ||
    !DIGEST_PATTERN.test(existingRecord.requestDigest) ||
    typeof existingRecord.operationId !== "string" ||
    !existingRecord.operationId
  ) {
    throw new IdempotencyError(
      "INVALID_STORED_RECORD",
      "Stored record has invalid fields"
    );
  }

  if (
    !timingSafeEqual(
      Buffer.from(requestDigest, "hex"),
      Buffer.from(
        existingRecord.requestDigest,
        "hex"
      )
    )
  ) {
    throw new IdempotencyError(
      "IDEMPOTENCY_CONFLICT",
      "Idempotency key was reused with different request content"
    );
  }

  return Object.freeze({
    kind: "REPLAY",
    operationId: existingRecord.operationId
  });
}
