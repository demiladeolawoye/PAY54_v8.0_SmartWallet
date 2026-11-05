
"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
  STAGING_BASELINE,
  validateHostingManifest,
  assertHostingManifest
} from "../deployment/hosting-policy.mjs";

const TEST_IMAGE =
  "europe-west2-docker.pkg.dev/pay54-staging/news/service@sha256:" +
  "a".repeat(64);

function validManifest() {
  return {
    ...STAGING_BASELINE,
    image: TEST_IMAGE
  };
}

test("accepts a complete private staging manifest", () => {
  const result = assertHostingManifest(validManifest());

  assert.equal(result.valid, true);
  assert.equal(result.environment, "staging");
  assert.deepEqual(result.violations, []);
});

test("rejects a public or unauthenticated service", () => {
  for (const changes of [
    { ingress: "all" },
    { allowUnauthenticated: true },
    { requireAuthentication: false }
  ]) {
    const result = validateHostingManifest({
      ...validManifest(),
      ...changes
    });

    assert.equal(result.valid, false);
    assert.ok(result.violations.length > 0);
  }
});

test("rejects live financial and provider execution", () => {
  for (const changes of [
    { financialExecutionEnabled: true },
    { newsProviderEnabled: true },
    { customerDataEnabled: true }
  ]) {
    assert.throws(
      () => assertHostingManifest({
        ...validManifest(),
        ...changes
      }),
      /deployment rejected/
    );
  }
});

test("rejects production and incorrect region", () => {
  for (const changes of [
    { environment: "production" },
    { region: "us-central1" },
    { provider: "unknown-host" }
  ]) {
    assert.equal(
      validateHostingManifest({
        ...validManifest(),
        ...changes
      }).valid,
      false
    );
  }
});

test("rejects mutable container image references", () => {
  for (const image of [
    "pay54/news:latest",
    "pay54/news:v1",
    "https://example.com/image",
    "pay54/news@sha256:bad",
    ""
  ]) {
    assert.equal(
      validateHostingManifest({
        ...validManifest(),
        image
      }).valid,
      false
    );
  }
});

test("rejects missing and unexpected properties", () => {
  const missing = validManifest();
  delete missing.requireAuthentication;

  assert.equal(
    validateHostingManifest(missing).valid,
    false
  );

  assert.equal(
    validateHostingManifest({
      ...validManifest(),
      apiToken: "do-not-store-secrets-here"
    }).valid,
    false
  );
});

test("rejects repository-based secrets", () => {
  assert.throws(
    () => assertHostingManifest({
      ...validManifest(),
      secretsInRepository: true
    }),
    /deployment rejected/
  );
});

test("rejects invalid manifest types", () => {
  for (const value of [
    null,
    undefined,
    [],
    "staging"
  ]) {
    assert.throws(
      () => validateHostingManifest(value),
      TypeError
    );
  }
});

test("does not mutate the deployment manifest", () => {
  const manifest = validManifest();
  const before = structuredClone(manifest);

  validateHostingManifest(manifest);

  assert.deepEqual(manifest, before);
});
