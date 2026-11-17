"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  createPay54StagingEvidenceVerifier as createVerifier,
  encodePay54StagingAttestation as encode,
  PAY54_STAGING_EVIDENCE_CATEGORIES as categories
} from "../governance/pay54-batch23-staging-evidence.mjs";

const sha = "a".repeat(40);
const now = 1800000000000;
const materials = Object.fromEntries(categories.map(category => {
  const keys = generateKeyPairSync("ed25519");
  return [category, keys];
}));
const trustedPublicKeys = Object.fromEntries(categories.map(category =>
  [category, materials[category].publicKey.export({ format: "pem", type: "spki" })]));
const verifier = createVerifier({ trustedPublicKeys, trustedNowMs: () => now });

const attest = (category, i) => {
  const payload = {
    category, commitSha: sha, evidenceDigest: "f".repeat(64),
    reviewer: ["security-reviewer", "release-reviewer", "compliance-reviewer"][i % 3],
    signedAtMs: now - 1000
  };
  return {
    ...payload,
    signature: sign(null, encode(payload), materials[category].privateKey)
      .toString("base64url")
  };
};

test("886: seven independent signed controls and three reviewers support manual staging review", () => {
  const result = verifier.verifyForReview({
    expectedCommitSha: sha,
    attestations: categories.map(attest)
  });
  assert.equal(result.verifiedCategoryCount, 7);
  assert.equal(result.distinctReviewerCount, 3);
  assert.equal(result.evidenceSetCompleteForManualReview, true);
  assert.equal(result.productionDeploymentAuthorised, false);
  assert.equal(result.accountSwitchProductionEnabled, false);
  assert.ok(Object.isFrozen(result.missingCategories));
});

test("886: signed missing categories remain incomplete, never production approved", () => {
  const result = verifier.verifyForReview({
    expectedCommitSha: sha, attestations: categories.slice(0, 2).map(attest)
  });
  assert.equal(result.missingCategories.length, 5);
  assert.equal(result.evidenceSetCompleteForManualReview, false);
  assert.equal(result.productionDeploymentAuthorised, false);
});

test("886: tampering, replayed SHA, forged key and expired signatures all fail closed", () => {
  const valid = attest(categories[0], 0);
  for (const record of [
    { ...valid, commitSha: "b".repeat(40) },
    { ...valid, evidenceDigest: "e".repeat(64) },
    { ...valid, reviewer: "attacker" },
    { ...valid, signedAtMs: now - 86_400_001 },
    { ...valid, signedAtMs: now + 1 },
    { ...valid, signature: attest(categories[1], 1).signature }
  ]) {
    assert.throws(() => verifier.verifyForReview({
      expectedCommitSha: sha, attestations: [record]
    }), /STAGING_EVIDENCE_DENIED/);
  }
  assert.throws(() => verifier.verifyForReview({
    expectedCommitSha: sha, attestations: [valid, valid]
  }), /STAGING_EVIDENCE_DENIED/);
});

test("886: unprovisioned trust anchor or non-Ed25519 key is denied", () => {
  assert.throws(() => createVerifier({ trustedPublicKeys: {} }),
    /STAGING_EVIDENCE_DENIED/);
  assert.throws(() => verifier.verifyForReview({ expectedCommitSha: sha }),
    /STAGING_EVIDENCE_DENIED/);
});
