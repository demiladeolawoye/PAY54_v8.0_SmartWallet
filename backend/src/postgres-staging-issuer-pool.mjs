"use strict";

/**
 * PAY54 Batch 25 / 989 — fourth staging-only identity session issuer pool.
 *
 * Extends the reviewed three-pool configuration without altering it.
 * There is no database connection, role membership, secret creation,
 * customer session issuance or HTTP route activation.
 */
import {loadPay54StagingPostgresConfigs}
 from "./postgres-staging-configuration.mjs";

const USER=/^[a-z_][a-z0-9_]{3,62}$/;
const deny=()=>{throw new Error("PAY54_STAGING_ISSUER_POOL_DENIED");};

export function loadPay54StagingIssuerPoolConfiguration(env){
 let existing;
 try{existing=loadPay54StagingPostgresConfigs(env);}catch{deny();}
 if(!env || typeof env!=="object" ||
    env.PAY54_STAGING_SESSION_ISSUER_POOL_ENABLED!=="true")deny();

 const user=env.PAY54_STAGING_PG_SESSION_ISSUER_USER;
 const password=env.PAY54_STAGING_PG_SESSION_ISSUER_PASSWORD;
 if(typeof user!=="string" || !USER.test(user) ||
    typeof password!=="string" || password.length<32 ||
    [existing.sessionRead,existing.accountRead,
     existing.rotationWrite].some(config=>
      config.user===user || config.password===password))deny();

 const pool=Object.freeze({
  ...existing.sessionRead,
  user,password,
  max:2,
  application_name:"pay54_staging_issuer",
  statement_timeout:8000
 });
 return Object.freeze({
  schema:"pay54.staging-four-pool-authentication.v1",
  sessionRead:existing.sessionRead,
  accountRead:existing.accountRead,
  rotationWrite:existing.rotationWrite,
  bootstrapIssuer:pool,
  issuerFunctionOnlyRoleRequired:"pay54_session_issue_role",
  fourDistinctCredentialSetsRequired:true,
  verifiedPostgresRoleAtRuntime:false,
  stagingDatabaseConnected:false,
  accountRoutesActivated:false,
  realMoneyAuthorised:false,
  productionReleaseAuthorised:false
 });
}
