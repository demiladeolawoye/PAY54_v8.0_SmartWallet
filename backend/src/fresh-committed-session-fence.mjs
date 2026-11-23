"use strict";
import {assertPay54PostgresReadRole} from "./postgres-rls-posture.mjs";
import {extractPay54BearerCredential,digestPay54BearerToken}
 from "./postgres-session-resolver.mjs";

/**
 * PAY54 Batch38: independent READ COMMITTED post-query session fence.
 * Opens a new transaction/physical checkout, never reuses the accounting
 * transaction's REPEATABLE READ snapshot.
 *
 * This does NOT establish atomicity against revocation immediately AFTER
 * the last fence check. Release approval still requires a serialized
 * revocation barrier/defined consistency contract.
 */
const DENIED="PAY54_FRESH_SESSION_FENCE_DENIED";
const deny=()=>{throw Error(DENIED);};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SQL=`SELECT session_id::text AS "sessionId",
 principal_id::text AS "principalId",
 active_account_id::text AS "activeAccountId",
 session_version::text AS "version"
 FROM pay54.auth_sessions
 WHERE token_digest=decode($1::text,'hex')
 AND session_status='ACTIVE'
 AND revoked_at IS NULL
 AND issued_at<=clock_timestamp()
 AND expires_at>clock_timestamp()
 LIMIT 2`;

export function createPay54FreshCommittedSessionFence({pool}={}){
 if(typeof pool?.connect!=="function")deny();
 return Object.freeze({
  async verify({request,expected}={}){
   if(!expected||!UUID.test(expected.sessionId??"")||
      !UUID.test(expected.principalId??"")||
      !UUID.test(expected.activeAccountId??"")||
      !Number.isSafeInteger(expected.version)||expected.version<1)deny();
   let client,started=false,discard=false;
   try{
    const digest=digestPay54BearerToken(extractPay54BearerCredential(request));
    client=await pool.connect();
    if(typeof client?.query!=="function"||typeof client?.release!=="function")deny();
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY");
    started=true;
    await assertPay54PostgresReadRole({client,tables:["auth_sessions"]});
    await client.query("SELECT set_config('pay54.session_digest',$1::text,true)",[digest]);
    const result=await client.query(SQL,[digest]);
    if(result?.rows?.length!==1)deny();
    const row=result.rows[0];
    if(row.sessionId!==expected.sessionId||
       row.principalId!==expected.principalId||
       row.activeAccountId!==expected.activeAccountId||
       Number(row.version)!==expected.version)deny();
    await client.query("COMMIT");
    started=false;
    return Object.freeze({
      schema:"pay54.fresh-session-commit-fence.v1",
      sessionVersion:expected.version,
      freshCommittedRead:true,
      unrestrictedBalanceDisplay:false,
      atomicRevocationBarrierProven:false,
      productionAuthorised:false
    });
   }catch{discard=true;deny();}
   finally{
    if(client){
      if(started){
        try{await client.query("ROLLBACK");}catch{discard=true;}
      }
      try{client.release(discard);}catch{/* driver may discard */}
    }
   }
  }
 });
}
