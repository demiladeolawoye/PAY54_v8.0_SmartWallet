"use strict";

/**
 * PAY54 CR-PAYTAG-01 P2B-B2B2 — trusted, disabled-by-default registration
 * transaction adapter. SOURCE ONLY. No route, role, SQL writer or grants.
 *
 * SQL function pay54.register_paytag_trusted(...) must be independently
 * implemented, migrated and reviewed before this adapter can ever succeed.
 */
import { randomUUID } from "node:crypto";
import { createPay54PayTagRegistrationAdmission }
  from "../domain/paytag-registration-admission.mjs";
import { createPay54PayTagRequestBinding }
  from "./paytag-registration-request-binding.mjs";

const DENIED="PAY54_PAYTAG_REGISTRATION_UNAVAILABLE";
const deny=()=>{throw new Error(DENIED);};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hex=/^[a-f0-9]{64}$/;

export const PAY54_PAYTAG_REGISTRATION_EXECUTOR_POSTURE=Object.freeze({
 schema:"pay54.paytag.registration-executor-adapter.v1",
 sourceOnly:true,
 httpRouteEnabled:false,
 writerFunctionProvisioned:false,
 productionRelease:"BLOCKED",
 financialExecutionEnabled:false
});

export const PAY54_PAYTAG_REGISTER_ROLE_SQL=`
SELECT current_user AS role_name,
       (SELECT NOT rolsuper AND NOT rolbypassrls FROM pg_roles
        WHERE rolname=current_user) AS restricted,
       has_function_privilege(current_user,
         'pay54.register_paytag_trusted(bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid)',
         'EXECUTE') AS may_register,
       has_table_privilege(current_user,'pay54.paytag_registry','INSERT,UPDATE,DELETE')
         AS may_write_registry,
       has_table_privilege(current_user,'pay54.paytag_registry_audit','INSERT,UPDATE,DELETE')
         AS may_write_audit,
       has_table_privilege(current_user,'pay54.paytag_registration_requests','INSERT,UPDATE,DELETE')
         AS may_write_idempotency,
       has_table_privilege(current_user,'pay54.ledger_entries','INSERT,UPDATE,DELETE')
         AS may_write_ledger,
       has_table_privilege(current_user,'pay54.auth_sessions','INSERT,UPDATE,DELETE')
         AS may_write_sessions
`;

export const PAY54_PAYTAG_REGISTER_SQL=`
SELECT tag_id::text AS "tagId",
       request_id::text AS "requestId",
       replayed AS "replayed"
  FROM pay54.register_paytag_trusted(
   $1::bytea,$2::bytea,$3::uuid,$4::bigint,$5::uuid,$6::uuid,
   $7::text,$8::bytea,$9::bytea,$10::uuid,$11::uuid
  )
`;

export function createPay54PostgresPayTagRegistrationExecutor({
  writePool,
  resolveAuthenticatedSession,
  trustedApplicationOrigin,
  idempotencyHmacKey,
  getTrustedServerTimeMs=Date.now,
  newId=randomUUID
}={}){
  if(!writePool||typeof writePool.connect!=="function"||
     typeof resolveAuthenticatedSession!=="function"||
     typeof getTrustedServerTimeMs!=="function"||
     typeof newId!=="function") deny();

  const admit=createPay54PayTagRegistrationAdmission({
    resolveAuthenticatedSession,getTrustedServerTimeMs
  });
  const bind=createPay54PayTagRequestBinding({
    trustedApplicationOrigin,idempotencyHmacKey
  });

  return async function registerPayTag({requestContext,requestPayload}={}){
    let client,started=false,commitAttempted=false,discard=false;
    try{
      const admission=await admit({requestContext,requestPayload});
      const proof=bind({requestContext,admission});
      const requestId=newId();
      const correlationId=newId();
      if(!uuid.test(requestId)||!uuid.test(correlationId)||
         requestId.toLowerCase()===correlationId.toLowerCase()||
         ![proof.sessionTokenDigest,proof.csrfDigest,
           proof.idempotencyKeyDigest,proof.requestDigest].every(x=>hex.test(x))) deny();

      client=await writePool.connect();
      if(!client||typeof client.query!=="function"||
         typeof client.release!=="function") deny();
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");
      started=true;
      await client.query("SET LOCAL lock_timeout = '3s'");
      await client.query("SET LOCAL statement_timeout = '8s'");

      // FAIL CLOSED if the reviewed function is absent: has_function_privilege
      // raises undefined_function rather than assuming an executable role.
      const role=await client.query(PAY54_PAYTAG_REGISTER_ROLE_SQL);
      const p=role?.rows?.[0];
      if(role?.rows?.length!==1||
         p.role_name!=="pay54_paytag_register_role"||
         p.restricted!==true||
         p.may_register!==true||
         p.may_write_registry!==false||
         p.may_write_audit!==false||
         p.may_write_idempotency!==false||
         p.may_write_ledger!==false||
         p.may_write_sessions!==false) deny();

      const values=[
        Buffer.from(proof.sessionTokenDigest,"hex"),
        Buffer.from(proof.csrfDigest,"hex"),
        proof.sessionId,proof.sessionVersion,proof.principalId,proof.accountId,
        proof.canonicalAlias,
        Buffer.from(proof.idempotencyKeyDigest,"hex"),
        Buffer.from(proof.requestDigest,"hex"),
        requestId,correlationId
      ];
      const result=await client.query(PAY54_PAYTAG_REGISTER_SQL,values);
      if(result?.rows?.length!==1||
         !uuid.test(result.rows[0].tagId??"")||
         !uuid.test(result.rows[0].requestId??"")||
         typeof result.rows[0].replayed!=="boolean"||
         (!result.rows[0].replayed &&
           result.rows[0].requestId.toLowerCase()!==requestId.toLowerCase())) deny();

      commitAttempted=true;
      await client.query("COMMIT");
      started=false;
      return Object.freeze({
        schema:"pay54.paytag.registration-committed.v1",
        tagId:result.rows[0].tagId.toLowerCase(),
        requestId:result.rows[0].requestId.toLowerCase(),
        replayed:result.rows[0].replayed,
        paymentAuthorised:false,
        recipientLookupAuthorised:false,
        productionHttpRouteActivated:false
      });
    }catch{
      if(commitAttempted) discard=true; // uncertain commit
      if(client&&started){
        try{await client.query("ROLLBACK");}catch{discard=true;}
      }
      deny();
    }finally{
      if(client){
        try{client.release(discard);}catch{/* broken socket discarded */}
      }
    }
  };
}
