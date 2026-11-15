"use strict";
import {requireAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {assertAccountReadStatement} from "./account-sql-policy.mjs";
import {freezeAccountReadRows} from "./account-read-results.mjs";

/* Unmounted read-only transaction with explicit database actor verification.
 * DOES NOT SET ROLE: a shared all-tenant switchable login is not secure.
 * A production pool must supply independently authenticated per-actor
 * connections, never a superuser, owner, group actor, or BYPASSRLS login.
 */
export function createAccountActorTransaction({pool}){
 if(!pool||typeof pool.connect!=="function")throw new TypeError("ACCOUNT_ACTOR_POOL_REQUIRED");
 return Object.freeze({
  async execute({dbPrincipal,sql,params}){
   const descriptor=requireAccountDbPrincipal(dbPrincipal);
   assertAccountReadStatement(sql,params,descriptor.principalId);
   const client=await pool.connect();
   if(!client||typeof client.query!=="function"||typeof client.release!=="function"){
    throw new TypeError("ACCOUNT_ACTOR_CLIENT_INVALID");
   }
   let started=false,failed=null,result;
   try{
    await client.query("BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED READ ONLY");
    started=true;
    await client.query("SET LOCAL row_security = on");
    await client.query("SET LOCAL lock_timeout = '1000ms'");
    await client.query("SET LOCAL statement_timeout = '3000ms'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '3000ms'");
    const actor=await client.query("SELECT current_user::text AS actor");
    if(!actor||!Array.isArray(actor.rows)||actor.rows.length!==1||
       actor.rows[0]?.actor!==descriptor.roleName){
      throw new Error("ACCOUNT_DB_ACTOR_MISMATCH");
    }
    result=freezeAccountReadRows(await client.query(sql,params));
    await client.query("COMMIT");
    started=false;
   }catch(e){
    failed=e;
    if(started){
     try{await client.query("ROLLBACK");}catch{/* discard client */}
    }
   }finally{
    client.release(failed!==null);
   }
   if(failed)throw failed;
   return result;
  }
 });
}
