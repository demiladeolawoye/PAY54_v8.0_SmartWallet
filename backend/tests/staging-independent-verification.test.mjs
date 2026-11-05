
"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  validateIndependentReviews,
  renderIndependentVerificationSummary
} from "../governance/staging-independent-verification.mjs";

const readJson = path =>
  JSON.parse(
    readFileSync(
      new URL(path, import.meta.url),
      "utf8"
    )
  );

const register = readJson(
  "../governance/staging-independent-reviews.json"
);

const evidence = {
  deploymentAuthorized: false,
  provisioningAuthorized: false,
  financialExecutionAuthorized: false,
  submissions: [{
    id: "EV-001",
    controlId: "STG-01",
    submittedBy: "github:submitter",
    reviewStatus: "PENDING_INDEPENDENT_REVIEW"
  }]
};

const intakeValidation = {
  valid: true,
  count: 1,
  independentlyVerified: 0,
  stagingApproved: false,
  deploymentAuthorized: false
};

const review = {
  id: "REV-001",
  submissionId: "EV-001",
  controlId: "STG-01",
  reviewer: "reviewer-one",
  decision: "PENDING_REVIEW",
  recordedAt: "2026-11-05T20:00:00.000Z"
};

const assess = (
  log = register,
  intake = evidence,
  validation = intakeValidation
) =>
  validateIndependentReviews(
    intake,
    validation,
    log
  );

const withReviews = (...items) => ({
  ...register,
  reviews: items
});

test(
  "empty candidate register validates without granting release",
  () => {
    const result = assess();

    assert.equal(
      result.valid,
      true,
      result.errors.join("; ")
    );

    assert.equal(result.independentlyVerified, 0);
    assert.equal(result.stagingApproved, false);
    assert.equal(result.deploymentAuthorized, false);
  }
);

test(
  "a distinct reviewer may register pending review",
  () => {
    const result = assess(withReviews(review));

    assert.equal(
      result.valid,
      true,
      result.errors.join("; ")
    );

    assert.equal(result.pendingCount, 1);
    assert.equal(result.independentlyVerified, 0);
  }
);

test(
  "a rejected review is recorded without approving staging",
  () => {
    const result = assess(
      withReviews({
        ...review,
        decision: "REJECTED"
      })
    );

    assert.equal(
      result.valid,
      true,
      result.errors.join("; ")
    );

    assert.equal(result.rejectedCount, 1);
    assert.equal(result.stagingApproved, false);
  }
);

test(
  "self-review is prohibited irrespective of case or GitHub prefix",
  () => {
    assert.equal(
      assess(
        withReviews({
          ...review,
          reviewer: "@SUBMITTER"
        })
      ).valid,
      false
    );
  }
);

test(
  "a claimed VERIFIED decision cannot bypass authentication",
  () => {
    assert.equal(
      assess(
        withReviews({
          ...review,
          decision: "VERIFIED"
        })
      ).valid,
      false
    );
  }
);

test(
  "an approval is never accepted as an offline review decision",
  () => {
    assert.equal(
      assess(
        withReviews({
          ...review,
          decision: "APPROVED"
        })
      ).valid,
      false
    );
  }
);

test(
  "unknown evidence reference is rejected",
  () => {
    assert.equal(
      assess(
        withReviews({
          ...review,
          submissionId: "EV-MISSING"
        })
      ).valid,
      false
    );
  }
);

test(
  "mismatched control is rejected",
  () => {
    assert.equal(
      assess(
        withReviews({
          ...review,
          controlId: "STG-02"
        })
      ).valid,
      false
    );
  }
);

test(
  "duplicate reviews of one submission are rejected",
  () => {
    assert.equal(
      assess(
        withReviews(
          review,
          {
            ...review,
            id: "REV-002"
          }
        )
      ).valid,
      false
    );
  }
);

test(
  "duplicate review identifiers are rejected",
  () => {
    const other = {
      ...evidence,
      submissions: [
        ...evidence.submissions,
        {
          ...evidence.submissions[0],
          id: "EV-002"
        }
      ]
    };

    assert.equal(
      assess(
        withReviews(
          review,
          {
            ...review,
            submissionId: "EV-002"
          }
        ),
        other,
        {
          ...intakeValidation,
          count: 2
        }
      ).valid,
      false
    );
  }
);

test(
  "extra review fields are rejected",
  () => {
    assert.equal(
      assess(
        withReviews({
          ...review,
          approved: true
        })
      ).valid,
      false
    );
  }
);

test(
  "malformed timestamps are rejected",
  () => {
    assert.equal(
      assess(
        withReviews({
          ...review,
          recordedAt: "2026-02-31T20:00:00Z"
        })
      ).valid,
      false
    );
  }
);

test(
  "authorization flags must remain disabled",
  () => {
    assert.equal(
      assess({
        ...register,
        deploymentAuthorized: true
      }).valid,
      false
    );

    assert.equal(
      assess({
        ...register,
        provisioningAuthorized: true
      }).valid,
      false
    );

    assert.equal(
      assess({
        ...register,
        financialExecutionAuthorized: true
      }).valid,
      false
    );
  }
);

test(
  "unvalidated or approved evidence intake is rejected",
  () => {
    assert.equal(
      assess(
        register,
        evidence,
        {
          ...intakeValidation,
          valid: false
        }
      ).valid,
      false
    );

    assert.equal(
      assess(
        register,
        evidence,
        {
          ...intakeValidation,
          stagingApproved: true
        }
      ).valid,
      false
    );
  }
);

test(
  "evidence count mismatch and duplicate submissions are rejected",
  () => {
    assert.equal(
      assess(
        register,
        evidence,
        {
          ...intakeValidation,
          count: 2
        }
      ).valid,
      false
    );

    const doubled = {
      ...evidence,
      submissions: [
        ...evidence.submissions,
        ...evidence.submissions
      ]
    };

    assert.equal(
      assess(
        withReviews(review),
        doubled,
        {
          ...intakeValidation,
          count: 2
        }
      ).valid,
      false
    );
  }
);

test(
  "report never claims independent verification or deployment",
  () => {
    const text =
      renderIndependentVerificationSummary(
        assess()
      );

    assert.match(
      text,
      /Authenticated independent verifications: 0/
    );

    assert.match(
      text,
      /Staging release: BLOCKED/
    );
  }
);
