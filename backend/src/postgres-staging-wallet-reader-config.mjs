"use strict";

import {loadPay54StagingIssuerPoolConfiguration}
 from "./postgres-staging-issuer-pool.mjs";

const DENIED="PAY54_STAGING_WALLET_IDENTITY_DENIED";
const ROLE="pay54_wallet_read_caller_role";
const USER=/^[a-z_][a-z0-9_]{3,62}$/;
const deny=()=>{throw Error(DENIED);};

/**
 * Fifth dedicated, isolated staging pool configuration. No connection is
 * created; credentials must originate from a protected deployment secret
 * service and must never be printed, stored in the repo or used in CI.
 */
export function loadPay54StagingWalletReaderConfiguration(env){
 let auth;
 try{auth=loadPay54StagingIssuerPoolConfiguration(env);}catch{deny();}
 if(env?.PAY54_STAGING_WALLET_READER_POOL_ENABLED!=="true"||
    env.PAY54_STAGING_WALLET_READER_RELEASE_APPROVED!=="false")deny();

 const user=env.PAY54_STAGING_PG_WALLET_READER_USER;
 const password=env.PAY54_STAGING_PG_WALLET_READER_PASSWORD;
 if(typeof user!=="string"||!USER.test(user)||
    typeof password!=="string"||password.length<32||
    !/^[!-~]+$/.test(password))deny();

 const existing=[auth.sessionRead,auth.accountRead,auth.rotationWrite,
  auth.bootstrapIssuer];
 if(existing.some(x=>x.user===user||x.password===password))deny();

 // pg/TLS validates both chain and endpoint hostname. No IP/localhost
 // accepted by the existing four-pool staging configuration.
 const base=auth.sessionRead;
 const walletRead=Object.freeze({
  ...base,
  user,password,
  ssl:Object.freeze({
   rejectUnauthorized:true,
   ca:base.ssl.ca,
   servername:base.host,
   minVersion:"TLSv1.2"
  }),
  application_name:"pay54_staging_wallet_read",
  max:2,
  connectionTimeoutMillis:5000,
  idleTimeoutMillis:10000,
  statement_timeout:8000,
  query_timeout:8000
 });
 return Object.freeze({
  schema:"pay54.staging-wallet-five-pool-configuration.v1",
  walletRead,
  requiredDatabaseRole:ROLE,
  externallyProvisionedLoginRequired:true,
  distinctCredentialCustodyRequired:true,
  credentialRotationIndependentlyUnverified:true,
  managedTlsIndependentlyUnverified:true,
  actualDatabaseLoginUnverified:true,
  stagingDeploymentAuthorised:false,
  customerWalletApiEnabled:false,
  productionAuthorised:false
 });
}
