
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — INDEPENDENT EVIDENCE REVIEW POLICY
   File: backend/governance/staging-independent-verification.mjs
   Version: 1.0.0

   Offline candidate-review validation only. No authentication, approvals,
   provisioning, deployment, network requests or financial execution.
   ========================================================================== */

const CONTROL_IDS = Object.freeze(
  Array.from(
    { length: 7 },
    (_, index) => `STG-${String(index + 1).padStart(2, "0")}`
  )
);

const DECISIONS = Object.freeze([
  "PENDING_REVIEW",
  "REJECTED"
]);

const ROOT_FIELDS = Object.freeze([
  "schemaVersion",
  "phase",
  "scope",
  "policy",
  "deploymentAuthorized",
  "provisioningAuthorized",
  "financialExecutionAuthorized",
  "reviews"
]);

const REVIEW_FIELDS = Object.freeze([
  "id",
  "submissionId",
  "controlId",
  "reviewer",
  "decision",
  "recordedAt"
]);

const SUBMISSION_FIELDS = Object.freeze([
  "id",
  "controlId",
  "submittedBy",
  "reviewStatus"
]);

const UUID_PATTERN =
  /^[a-zA-Z0-9][a-zA-Z0-9._:-]{2,99}$/;

const USERNAME_PATTERN =
  /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;

const isObject = value =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);

const hasOwn = (obj, key) =>
  Object.prototype.hasOwnProperty.call(obj, key);

const exactKeys = (obj, keys) =>
  isObject(obj) &&
  Object.keys(obj).length === keys.length &&
  keys.every(key => hasOwn(obj, key));

const isUtcTimestamp = value =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(Date.parse(value)).toISOString().slice(0, 19) ===
    value.slice(0, 19);

function canonicalUser(value) {
  if (typeof value !== "string") return "";

  const user = value
    .trim()
    .replace(/^github:/i, "")
    .replace(/^@/, "");

  return USERNAME_PATTERN.test(user)
    ? user.toLowerCase()
    : "";
}

export function validateIndependentReviews(
  intake,
  intakeValidation,
  log
) {
  const errors = [];
  const fail = message => errors.push(message);

  const invalidResult = () =>
    Object.freeze({
      valid: false,
      errors: Object.freeze([...errors]),
      reviewCount: 0,
      pendingCount: 0,
      rejectedCount: 0,
      independentlyVerified: 0,
      stagingApproved: false,
      deploymentAuthorized: false,
      provisioningAuthorized: false,
      financialExecutionAuthorized: false
    });

  if (
    !isObject(intakeValidation) ||
    intakeValidation.valid !== true ||
    !Number.isSafeInteger(intakeValidation.count) ||
    intakeValidation.count < 0 ||
    intakeValidation.stagingApproved !== false ||
    intakeValidation.deploymentAuthorized !== false ||
    intakeValidation.independentlyVerified !== 0
  ) {
    fail(
      "Phase 2G-P intake must pass validation and remain unapproved."
    );
    return invalidResult();
  }

  if (
    !isObject(intake) ||
    !Array.isArray(intake.submissions) ||
    intake.submissions.length !== intakeValidation.count ||
    intake.deploymentAuthorized !== false ||
    intake.provisioningAuthorized !== false ||
    intake.financialExecutionAuthorized !== false
  ) {
    fail(
      "Evidence intake and its validation result are inconsistent."
    );
    return invalidResult();
  }

  if (!exactKeys(log, ROOT_FIELDS)) {
    fail(
      "Independent review register has missing or unknown fields."
    );
    return invalidResult();
  }

  if (
    log.schemaVersion !== "1.0.0" ||
    log.phase !== "2G-Q" ||
    log.scope !== "staging" ||
    log.policy !==
      "AUTHENTICATED_INDEPENDENT_ATTESTATION_REQUIRED"
  ) {
    fail(
      "Independent review policy or schema is invalid."
    );
  }

  for (const flag of [
    "deploymentAuthorized",
    "provisioningAuthorized",
    "financialExecutionAuthorized"
  ]) {
    if (log[flag] !== false) {
      fail(`${flag} must be false.`);
    }
  }

  if (
    !Array.isArray(log.reviews) ||
    log.reviews.length > 100
  ) {
    fail(
      "Reviews must be an array containing at most 100 entries."
    );
    return invalidResult();
  }

  const submissions = new Map();

  for (const submission of intake.submissions) {
    if (
      !isObject(submission) ||
      !SUBMISSION_FIELDS.every(
        key => hasOwn(submission, key)
      ) ||
      typeof submission.id !== "string" ||
      !CONTROL_IDS.includes(submission.controlId) ||
      !canonicalUser(submission.submittedBy) ||
      submission.reviewStatus !==
        "PENDING_INDEPENDENT_REVIEW" ||
      submissions.has(submission.id)
    ) {
      fail(
        "Phase 2G-P submissions have inconsistent review metadata."
      );
      continue;
    }

    submissions.set(submission.id, submission);
  }

  const reviewIds = new Set();
  const reviewedSubmissions = new Set();

  let pendingCount = 0;
  let rejectedCount = 0;

  for (const [index, review] of log.reviews.entries()) {
    const prefix = `reviews[${index}]`;

    if (!exactKeys(review, REVIEW_FIELDS)) {
      fail(`${prefix}: missing or unknown fields.`);
      continue;
    }

    if (
      typeof review.id !== "string" ||
      !UUID_PATTERN.test(review.id) ||
      reviewIds.has(review.id)
    ) {
      fail(
        `${prefix}: invalid or duplicate review ID.`
      );
    } else {
      reviewIds.add(review.id);
    }

    if (
      typeof review.submissionId !== "string" ||
      reviewedSubmissions.has(review.submissionId)
    ) {
      fail(
        `${prefix}: duplicate or invalid submission reference.`
      );
    } else {
      reviewedSubmissions.add(review.submissionId);
    }

    const submission =
      submissions.get(review.submissionId);

    if (
      !submission ||
      submission.controlId !== review.controlId
    ) {
      fail(
        `${prefix}: unknown submission or mismatched control.`
      );
    }

    const reviewer = canonicalUser(review.reviewer);

    if (!reviewer) {
      fail(
        `${prefix}: reviewer must be a GitHub username.`
      );
    }

    if (
      submission &&
      reviewer &&
      reviewer === canonicalUser(submission.submittedBy)
    ) {
      fail(
        `${prefix}: self-review is prohibited.`
      );
    }

    if (!isUtcTimestamp(review.recordedAt)) {
      fail(
        `${prefix}: recordedAt must be a valid canonical UTC timestamp.`
      );
    }

    if (!DECISIONS.includes(review.decision)) {
      fail(
        `${prefix}: untrusted or unsupported review decision.`
      );
    } else if (
      review.decision === "PENDING_REVIEW"
    ) {
      pendingCount++;
    } else {
      rejectedCount++;
    }
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze([...errors]),
    reviewCount: log.reviews.length,
    pendingCount,
    rejectedCount,
    independentlyVerified: 0,
    stagingApproved: false,
    deploymentAuthorized: false,
    provisioningAuthorized: false,
    financialExecutionAuthorized: false
  });
}

export function renderIndependentVerificationSummary(
  result
) {
  if (
    !isObject(result) ||
    typeof result.valid !== "boolean"
  ) {
    throw new TypeError(
      "Invalid independent review result."
    );
  }

  const output = [
    "## PAY54 Phase 2G-Q — Independent Evidence Review",
    "",
    "**OFFLINE REVIEW POLICY — NOT AN INDEPENDENT APPROVAL**",
    "",
    `Validation: ${result.valid ? "PASS" : "FAIL"}`,
    `Candidate review records: ${result.reviewCount}`,
    `Pending review records: ${result.pendingCount}`,
    `Rejected review records: ${result.rejectedCount}`,
    "Authenticated independent verifications: 0",
    "Staging release: BLOCKED",
    "",
    "Review identifiers and claimed GitHub usernames are not authenticated by this job.",
    "A separate authenticated identity, source-integrity and reviewer-approval process is required.",
    "No cloud credentials, provisioning, deployment or financial execution are permitted."
  ];

  if (!result.valid) {
    output.push(
      "",
      "### Validation failures",
      ...result.errors.map(error => `- ${error}`)
    );
  }

  return output.join("\n");
}
