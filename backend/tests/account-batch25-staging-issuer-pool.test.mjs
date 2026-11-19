"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {loadPay54StagingIssuerPoolConfiguration as load}
 from "../src/postgres-staging-issuer-pool.mjs";

const ca="-----BEGIN CERTIFICATE-----\n"+"A".repeat(160)+
 "\n-----END CERTIFICATE-----";
const env={
 PAY54_ENV:"staging",PAY54_REAL_MONEY_MODE:"false",
 PAY54_STAGING_DB_CONNECTION_ALLOWED:"true",
 PAY54_STAGING_SESSION_ISSUER_POOL_ENABLED:"true",
 PAY54_STAGING_PG_HOST:"staging-db.example.internal",
 PAY54_STAGING_PG_PORT:"5432",
 PAY54_STAGING_PG_DATABASE:"pay54_staging",
 PAY54_STAGING_PG_CA_PEM:ca,
 PAY54_STAGING_PG_SESSION_READER_USER:"pay54_session_reader",
 PAY54_STAGING_PG_SESSION_READER_PASSWORD:"A".repeat(48),
 PAY54_STAGING_PG_ACCOUNT_READER_USER:"pay54_account_reader",
 PAY54_STAGING_PG_ACCOUNT_READER_PASSWORD:"B".repeat(48),
 PAY54_STAGING_PG_SESSION_ROTATOR_USER:"pay54_session_rotator",
 PAY54_STAGING_PG_SESSION_ROTATOR_PASSWORD:"C".repeat(48),
 PAY54_STAGING_PG_SESSION_ISSUER_USER:"pay54_session_issuer",
 PAY54_STAGING_PG_SESSION_ISSUER_PASSWORD:"D".repeat(48)
};
test("990: fourth issuer is isolated with certificate-validating TLS",()=>{
 const r=load(env);
 assert.equal(r.bootstrapIssuer.user,"pay54_session_issuer");
 assert.equal(r.bootstrapIssuer.ssl.rejectUnauthorized,true);
 assert.equal(r.bootstrapIssuer.max,2);
 assert.equal(r.issuerFunctionOnlyRoleRequired,"pay54_session_issue_role");
 assert.equal(r.stagingDatabaseConnected,false);
 assert.equal(r.productionReleaseAuthorised,false);
 assert.ok(Object.isFrozen(r));
});
test("990: shared issuer/login identity, weak password and production mode deny",()=>{
 for(const change of [
  {PAY54_STAGING_PG_SESSION_ISSUER_USER:
   env.PAY54_STAGING_PG_SESSION_READER_USER},
  {PAY54_STAGING_PG_SESSION_ISSUER_PASSWORD:
   env.PAY54_STAGING_PG_ACCOUNT_READER_PASSWORD},
  {PAY54_STAGING_PG_SESSION_ISSUER_PASSWORD:"short"},
  {PAY54_ENV:"production"},
  {PAY54_STAGING_SESSION_ISSUER_POOL_ENABLED:"false"},
  {PAY54_STAGING_PG_CA_PEM:"none"}
 ])assert.throws(()=>load({...env,...change}),
  /STAGING_ISSUER_POOL_DENIED/);
});
