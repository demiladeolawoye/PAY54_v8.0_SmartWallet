"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { loadPay54StagingPostgresConfigs as load }
  from "../src/postgres-staging-configuration.mjs";

const ca = "-----BEGIN CERTIFICATE-----\n" + "A".repeat(160) +
  "\n-----END CERTIFICATE-----";
const env = Object.freeze({
  PAY54_ENV: "staging",
  PAY54_REAL_MONEY_MODE: "false",
  PAY54_STAGING_DB_CONNECTION_ALLOWED: "true",
  PAY54_STAGING_PG_HOST: "staging-db.example.internal",
  PAY54_STAGING_PG_PORT: "5432",
  PAY54_STAGING_PG_DATABASE: "pay54_staging",
  PAY54_STAGING_PG_CA_PEM: ca,
  PAY54_STAGING_PG_SESSION_READER_USER: "pay54_auth_session_reader",
  PAY54_STAGING_PG_SESSION_READER_PASSWORD: "A".repeat(48),
  PAY54_STAGING_PG_ACCOUNT_READER_USER: "pay54_account_directory_reader",
  PAY54_STAGING_PG_ACCOUNT_READER_PASSWORD: "B".repeat(48),
  PAY54_STAGING_PG_SESSION_ROTATOR_USER: "pay54_account_session_rotator",
  PAY54_STAGING_PG_SESSION_ROTATOR_PASSWORD: "C".repeat(48)
});

test("888: distinct staging role credentials require verified TLS and no live connection", () => {
  const value = load(env);
  assert.equal(value.schema, "pay54.staging-postgres-pools.v1");
  assert.equal(value.sessionRead.user, env.PAY54_STAGING_PG_SESSION_READER_USER);
  assert.equal(value.accountRead.user, env.PAY54_STAGING_PG_ACCOUNT_READER_USER);
  assert.equal(value.rotationWrite.user, env.PAY54_STAGING_PG_SESSION_ROTATOR_USER);
  assert.equal(value.rotationWrite.ssl.rejectUnauthorized, true);
  assert.equal(value.productionDeploymentAuthorised, false);
  assert.equal(value.connectionEstablished, false);
  assert.ok(Object.isFrozen(value));
  assert.ok(Object.isFrozen(value.sessionRead.ssl));
});

test("888: production, missing opt-in, weak secret and shared role identities deny", () => {
  for (const mutation of [
    { PAY54_ENV: "production" },
    { PAY54_STAGING_DB_CONNECTION_ALLOWED: "false" },
    { PAY54_REAL_MONEY_MODE: "true" },
    { PAY54_STAGING_PG_SESSION_READER_PASSWORD: "short" },
    { PAY54_STAGING_PG_SESSION_ROTATOR_USER: env.PAY54_STAGING_PG_SESSION_READER_USER },
    { PAY54_STAGING_PG_SESSION_ROTATOR_PASSWORD: env.PAY54_STAGING_PG_ACCOUNT_READER_PASSWORD },
    { PAY54_STAGING_PG_HOST: "127.0.0.1" },
    { PAY54_STAGING_PG_HOST: "localhost" },
    { PAY54_STAGING_PG_CA_PEM: "rejectUnauthorized:false" },
    { PAY54_STAGING_PG_PORT: "0" }
  ]) assert.throws(() => load({ ...env, ...mutation }), /STAGING_DATABASE_CONFIG_DENIED/);
  assert.throws(() => load(null), /STAGING_DATABASE_CONFIG_DENIED/);
});

test("888: error messages never reveal a database password", () => {
  try {
    load({ ...env, PAY54_STAGING_PG_SESSION_READER_USER: "bad" });
    assert.fail("expected rejection");
  } catch(error) {
    assert.equal(error.message, "PAY54_STAGING_DATABASE_CONFIG_DENIED");
    assert.equal(error.message.includes(env.PAY54_STAGING_PG_SESSION_READER_PASSWORD), false);
  }
});
