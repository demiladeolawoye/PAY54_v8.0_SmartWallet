"use strict";

/**
 * PAY54 Batch 23 / 887 — staging PostgreSQL connection configuration.
 *
 * Only an independently provisioned STAGING deployment can invoke this
 * factory. No network connection or database creation occurs here. The app
 * foundation's production/staging startup denial remains unchanged.
 *
 * Credentials must be supplied through the deployment secret manager and
 * must never be committed, logged, included in CI artifacts or returned by
 * diagnostics. A valid CA chain is verified by the PostgreSQL TLS client.
 */
import { isIP } from "node:net";

const HOST = /^(?=.{4,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])$/;
const USER = /^[a-z_][a-z0-9_]{3,62}$/;
const DB = /^[a-z_][a-z0-9_]{3,62}$/;
const deny = () => { throw new Error("PAY54_STAGING_DATABASE_CONFIG_DENIED"); };

export function loadPay54StagingPostgresConfigs(env) {
  if (!env || typeof env !== "object" ||
      env.PAY54_ENV !== "staging" ||
      env.PAY54_REAL_MONEY_MODE !== "false" ||
      env.PAY54_STAGING_DB_CONNECTION_ALLOWED !== "true") deny();

  const host = env.PAY54_STAGING_PG_HOST;
  const database = env.PAY54_STAGING_PG_DATABASE;
  const port = Number(env.PAY54_STAGING_PG_PORT);
  const ca = env.PAY54_STAGING_PG_CA_PEM;
  if (typeof host !== "string" || !HOST.test(host) ||
      isIP(host) !== 0 || host.includes("..") ||
      host === "localhost" ||
      !DB.test(database ?? "") ||
      !Number.isInteger(port) || port < 1 || port > 65535 ||
      typeof ca !== "string" || ca.length < 100 ||
      !ca.includes("-----BEGIN CERTIFICATE-----") ||
      !ca.includes("-----END CERTIFICATE-----")) deny();

  const roles = [
    ["session", "PAY54_STAGING_PG_SESSION_READER"],
    ["account", "PAY54_STAGING_PG_ACCOUNT_READER"],
    ["rotator", "PAY54_STAGING_PG_SESSION_ROTATOR"]
  ];
  const users = new Set();
  const passwords = new Set();
  const configs = Object.create(null);
  for (const [name, prefix] of roles) {
    const user = env[prefix + "_USER"];
    const password = env[prefix + "_PASSWORD"];
    if (!USER.test(user ?? "") ||
        typeof password !== "string" || password.length < 32 ||
        users.has(user) || passwords.has(password)) deny();
    users.add(user);
    passwords.add(password);
    configs[name] = Object.freeze({
      host, port, database, user, password,
      ssl: Object.freeze({ rejectUnauthorized: true, ca }),
      max: name === "rotator" ? 2 : 5,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 10_000,
      statement_timeout: 8_000,
      application_name: "pay54_staging_" + name
    });
  }

  return Object.freeze({
    schema: "pay54.staging-postgres-pools.v1",
    sessionRead: configs.session,
    accountRead: configs.account,
    rotationWrite: configs.rotator,
    connectionEstablished: false,
    productionDeploymentAuthorised: false,
    applicationHttpEndpointsEnabled: false
  });
}
