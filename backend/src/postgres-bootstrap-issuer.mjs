"use strict";

/**
 * PAY54 Batch 24 / 927 — trusted assertion-to-session bootstrap issuer.
 *
 * Non-HTTP service. Authenticates an assertion with independent pinned
 * Ed25519 verification keys, consumes its jti transactionally in PostgreSQL,
 * creates an account-unbound short-lived session, and returns credentials
 * only after COMMIT. Caller SQL role has EXECUTE only, no table DML.
 *
 * No external identity provider is connected by importing this code.
 * No production or staging customer session endpoint is activated.
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { parsePay54SessionIssuanceRequest }
  from "../security/identity-ingress.mjs";

const deny=()=>{throw new Error("PAY54_BOOTSTRAP_SERVICE_UNAVAILABLE");};
const digest=raw=>createHash("sha256").update(raw).digest();
const ROLE_SQL=`SELECT current_user AS role_name,
 (SELECT NOT rolsuper AND NOT rolbypassrls AND NOT rolcanlogin
  FROM pg_roles WHERE rolname=current_user) AS restricted,
 has_function_privilege(current_user,
  'pay54.consume_identity_assertion_and_issue_bootstrap(text,uuid,uuid,timestamptz,uuid,bytea,bytea)',
  'EXECUTE') AS may_issue,
 has_table_privilege(current_user,'pay54.auth_sessions','INSERT,UPDATE,DELETE')
  AS may_write_sessions,
 has_table_privilege(current_user,'pay54.identity_assertion_receipts','INSERT')
  AS may_write_receipts,
 has_table_privilege(current_user,'pay54.ledger_entries','INSERT,UPDATE,DELETE')
  AS may_write_ledger`;

const ISSUE_SQL=`SELECT issued_session_id::text AS "sessionId",
 (round(extract(epoch from issued_expires_at)*1000))::bigint::text
   AS "expiresAtMs"
 FROM pay54.consume_identity_assertion_and_issue_bootstrap(
  $1::text,$2::uuid,$3::uuid,$4::timestamptz,
  $5::uuid,$6::bytea,$7::bytea
 )`;

export function createPay54PostgresBootstrapIssuer({
  writePool,identityVerifier,trustedApplicationOrigin,
  getTrustedServerTimeMs=Date.now
}={}){
  if(!writePool || typeof writePool.connect!=="function" ||
     typeof identityVerifier?.verifyAccessToken!=="function" ||
     typeof trustedApplicationOrigin!=="string" ||
     typeof getTrustedServerTimeMs!=="function")deny();

  return async function issueBootstrapSession({requestPayload,requestOrigin}={}){
    let verified;
    try{
      const input=parsePay54SessionIssuanceRequest({
        requestPayload,requestOrigin,trustedApplicationOrigin
      });
      verified=identityVerifier.verifyAccessToken(input.accessAssertion);
      if(verified?.schema!=="pay54.verified-identity-access.v1" ||
         verified.cryptographicSignatureVerified!==true ||
         verified.accountSessionCreated!==false ||
         verified.oneTimeAssertionConsumptionRequired!==true ||
         typeof verified.issuer!=="string" ||
         typeof verified.principalId!=="string" ||
         typeof verified.assertionId!=="string" ||
         !Number.isSafeInteger(verified.expiresAtSeconds))deny();
    }catch{deny();}

    const now=getTrustedServerTimeMs();
    if(!Number.isSafeInteger(now) || now<=0 ||
       verified.expiresAtSeconds*1000<=now ||
       verified.expiresAtSeconds*1000>now+5*60*1000)deny();

    const tokenRaw=randomBytes(32);
    const csrfRaw=randomBytes(32);
    const sessionId=randomUUID();
    let client,started=false,discard=false,commitAttempted=false;
    try{
      client=await writePool.connect();
      if(!client || typeof client.query!=="function" ||
         typeof client.release!=="function")deny();
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");
      started=true;
      await client.query("SET LOCAL lock_timeout='3s'");
      await client.query("SET LOCAL statement_timeout='8s'");
      const role=await client.query(ROLE_SQL);
      const p=role?.rows?.[0];
      if(role?.rows?.length!==1 ||
         p.role_name!=="pay54_session_issue_role" ||
         p.restricted!==true || p.may_issue!==true ||
         p.may_write_sessions!==false ||
         p.may_write_receipts!==false ||
         p.may_write_ledger!==false)deny();

      const result=await client.query(ISSUE_SQL,[
        verified.issuer,verified.principalId,verified.assertionId,
        new Date(verified.expiresAtSeconds*1000),
        sessionId,digest(tokenRaw),digest(csrfRaw)
      ]);
      const record=result?.rows?.[0];
      const expiry=Number(record?.expiresAtMs);
      if(result?.rows?.length!==1 || record.sessionId?.toLowerCase()!==sessionId ||
         !Number.isSafeInteger(expiry) || expiry<=now ||
         expiry>verified.expiresAtSeconds*1000 || expiry>now+300000)deny();

      commitAttempted=true;
      await client.query("COMMIT");
      started=false;
      return Object.freeze({
        schema:"pay54.bootstrap-session-issued.v1",
        sessionId,version:1,
        bearerToken:tokenRaw.toString("base64url"),
        csrfToken:csrfRaw.toString("base64url"),
        expiresAtMs:expiry,
        activeAccountId:null,
        accountDirectoryReadAuthorised:false,
        moneyOperationAuthorised:false,
        productionHttpEndpointActive:false
      });
    }catch{
      if(commitAttempted)discard=true;
      if(client && started){
        try{await client.query("ROLLBACK");}catch{discard=true;}
      }
      deny();
    }finally{
      if(client){try{client.release(discard);}catch{/* driver discarded */}}
      tokenRaw.fill(0);
      csrfRaw.fill(0);
    }
  };
}

export const PAY54_BOOTSTRAP_SQL=Object.freeze({ROLE_SQL,ISSUE_SQL});
