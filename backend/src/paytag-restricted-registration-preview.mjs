"use strict";

/**
 * PAY54 CR-PAYTAG-01 B2B10 — disposable-only restricted execution adapter.
 *
 * Not a production connector or HTTP endpoint. No DATABASE URL, credentials,
 * live pool, cloud identity, secret store or role membership is provisioned.
 * The existing public adapter remains unchanged to prevent regression.
 *
 * An independently approved provider must eventually prove its physical
 * database identity and custody; a mock proving this contract does not.
 */
import { randomUUID } from "node:crypto";
import { createPay54PayTagRegistrationAdmission }
  from "../domain/paytag-registration-admission.mjs";
import { createPay54PayTagRequestBinding }
  from "./paytag-registration-request-binding.mjs";

const DENIED="PAY54_PAYTAG_RESTRICTED_PREVIEW_UNAVAILABLE";
const deny=()=>{throw Error(DENIED);};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hex=/^[0-9a-f]{64}$/;
const ROLE="pay54_paytag_register_role";

export const PAY54_PAYTAG_RESTRICTED_PREVIEW_POSTURE=Object.freeze({
 schema:"pay54.paytag.restricted-preview.v1",
 environment:"disposable-test",
 httpRouteEnabled:false,
 liveDbConnectorProvisioned:false,
 persistentStagingEnabled:false,
 productionEnabled:false,
 financialExecutionEnabled:false
});

export const PAY54_PAYTAG_RESTRICTED_ROLE_SQL=`
SELECT current_user AS role_name,
       (SELECT NOT rolcanlogin AND NOT rolinherit AND NOT rolsuper
                   AND NOT rolbypassrls AND NOT rolcreaterole
          FROM pg_roles WHERE rolname=current_user) AS role_restricted,
       has_function_privilege(current_user,
         'pay54.register_paytag_restricted(bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid)',
         'EXECUTE') AS can_call_wrapper,
       has_function_privilege(current_user,
         'pay54.register_paytag_trusted(bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid)',
         'EXECUTE') AS can_call_writer,
       has_table_privilege(current_user,'pay54.auth_sessions',
         'SELECT,INSERT,UPDATE,DELETE') AS sessions_access,
       has_table_privilege(current_user,'pay54.paytag_registry',
         'SELECT,INSERT,UPDATE,DELETE') AS registry_access,
       has_table_privilege(current_user,'pay54.paytag_registration_requests',
         'SELECT,INSERT,UPDATE,DELETE') AS idempotency_access,
       has_table_privilege(current_user,'pay54.paytag_registry_audit',
         'SELECT,INSERT,UPDATE,DELETE') AS audit_access,
       has_table_privilege(current_user,'pay54.ledger_entries',
         'SELECT,INSERT,UPDATE,DELETE') AS ledger_access,
       EXISTS (
         SELECT 1 FROM pg_auth_members m
         WHERE m.member=(SELECT oid FROM pg_roles WHERE rolname=current_user)
           OR m.roleid=(SELECT oid FROM pg_roles WHERE rolname=current_user)
       ) AS role_has_membership
`;

export const PAY54_PAYTAG_RESTRICTED_CALL_SQL=`
SELECT tag_id::text AS "tagId", request_id::text AS "requestId",
       replayed AS "replayed"
  FROM pay54.register_paytag_restricted(
    $1::bytea,$2::bytea,$3::uuid,$4::bigint,$5::uuid,$6::uuid,
    $7::text,$8::bytea,$9::bytea,$10::uuid,$11::uuid
  )
`;

function verifiedRole(result){
 const row=result?.rows?.[0];
 return result?.rows?.length===1 && row?.role_name===ROLE &&
  row.role_restricted===true && row.can_call_wrapper===true &&
  row.can_call_writer===false && row.sessions_access===false &&
  row.registry_access===false && row.idempotency_access===false &&
  row.audit_access===false && row.ledger_access===false &&
  row.role_has_membership===false;
}

/**
 * Only accepts an injected disposable-test client factory. No credentials or
 * secret values may be passed in the request payload; server-side resolver
 * and binding must be independently trusted by the embedding test harness.
 */
export function createPay54RestrictedRegistrationPreview({
 environment, connectDisposableClient, resolveAuthenticatedSession,
 trustedApplicationOrigin, idempotencyHmacKey,
 getTrustedServerTimeMs=Date.now,newId=randomUUID
}={}){
 if(environment!=="disposable-test" ||
    typeof connectDisposableClient!=="function" ||
    typeof resolveAuthenticatedSession!=="function" ||
    typeof getTrustedServerTimeMs!=="function" ||
    typeof newId!=="function")deny();

 const admit=createPay54PayTagRegistrationAdmission({
  resolveAuthenticatedSession,getTrustedServerTimeMs
 });
 const bind=createPay54PayTagRequestBinding({
  trustedApplicationOrigin,idempotencyHmacKey
 });
 const active=new WeakSet();

 return async function preview({requestContext,requestPayload}={}){
  let client,started=false,commitAttempted=false,committed=false;
  let values;
  try{
   const admission=await admit({requestContext,requestPayload});
   const binding=bind({requestContext,admission});
   const requestId=newId(),correlationId=newId();
   if(!uuid.test(requestId??"")||!uuid.test(correlationId??"")||
      requestId.toLowerCase()===correlationId.toLowerCase()||
      ![binding.sessionTokenDigest,binding.csrfDigest,
        binding.idempotencyKeyDigest,binding.requestDigest].every(x=>hex.test(x)))deny();

   client=await connectDisposableClient();
   if(!client||typeof client!=="object"||
      typeof client.query!=="function"||typeof client.release!=="function"||
      active.has(client))deny();
   active.add(client);
   await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");
   started=true;
   await client.query("SET LOCAL lock_timeout = '3s'");
   await client.query("SET LOCAL statement_timeout = '8s'");
   if(!verifiedRole(await client.query(PAY54_PAYTAG_RESTRICTED_ROLE_SQL)))deny();

   values=[
    Buffer.from(binding.sessionTokenDigest,"hex"),
    Buffer.from(binding.csrfDigest,"hex"),
    binding.sessionId,binding.sessionVersion,binding.principalId,
    binding.accountId,binding.canonicalAlias,
    Buffer.from(binding.idempotencyKeyDigest,"hex"),
    Buffer.from(binding.requestDigest,"hex"),requestId,correlationId
   ];
   const result=await client.query(PAY54_PAYTAG_RESTRICTED_CALL_SQL,values);
   const row=result?.rows?.[0];
   if(result?.rows?.length!==1||!uuid.test(row?.tagId??"")||
      !uuid.test(row?.requestId??"")||typeof row?.replayed!=="boolean"||
      (!row.replayed && row.requestId.toLowerCase()!==requestId.toLowerCase()))deny();

   // The wrapper can become eligible for persistent deployment ONLY in a
   // separately reviewed connector and route. Here no success is announced
   // until the ephemeral database acknowledges COMMIT.
   // The connection may have been altered during execution; deny the
   // commit if the effective database role no longer matches the contract.
   if(!verifiedRole(await client.query(PAY54_PAYTAG_RESTRICTED_ROLE_SQL)))deny();
   commitAttempted=true;
   await client.query("COMMIT");
   committed=true;
   return Object.freeze({
    schema:"pay54.paytag.restricted-preview-result.v1",
    tagId:row.tagId.toLowerCase(),
    requestId:row.requestId.toLowerCase(),
    replayed:row.replayed,
    environment:"disposable-test",
    customerRegistrationEnabled:false,
    financialExecutionEnabled:false,
    productionRelease:"BLOCKED"
   });
  }catch{
   if(started && !committed && !commitAttempted && client){
    try{await client.query("ROLLBACK");}catch{/* discard below */}
   }
   // COMMIT uncertainty must never trigger a retry or a success receipt.
   deny();
  }finally{
   if(values){
    for(const v of values)if(Buffer.isBuffer(v))v.fill(0);
   }
   if(client && active.has(client)){
    active.delete(client);
    // No physical session reuse: conservative even after success.
    try{client.release(true);}catch{/* already quarantined */}
   }else if(client && typeof client.release==="function" &&
            typeof client.query!=="function"){
    // An invalid fresh checkout is not an authorised shared connection.
    try{client.release(true);}catch{/* already quarantined */}
   }
  }
 };
}
