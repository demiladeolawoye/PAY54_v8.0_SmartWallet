"use strict";
/**
 * Batch27/1132 — read-only PostgreSQL FORCE RLS catalogue inspection.
 * The pool must be a separately authorised read-only staging connection.
 * This query never touches customer table data or grants permissions.
 */
const SQL=`SELECT n.nspname AS schema_name,c.relname AS table_name,
 c.relrowsecurity AS rls_enabled,c.relforcerowsecurity AS rls_forced
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='pay54' AND c.relname=ANY($1::text[])
 AND c.relkind IN ('r','p') ORDER BY c.relname`;
const TABLES=Object.freeze(["account_contexts","account_memberships",
 "auth_sessions","identity_assertion_receipts"]);
const deny=()=>{throw Error("PAY54_STAGING_RLS_CATALOGUE_DENIED");};
export function createPay54StagingRlsInspector({readPool}={}){
 if(typeof readPool?.connect!=="function")deny();
 return async function verify(){
  let client,started=false,discard=false;
  try{
   client=await readPool.connect();
   if(typeof client?.query!=="function"||
      typeof client?.release!=="function")deny();
   await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
   started=true;
   await client.query("SET LOCAL statement_timeout='5s'");
   const r=await client.query(SQL,[TABLES]);
   if(!Array.isArray(r?.rows)||r.rows.length!==4 ||
      new Set(r.rows.map(x=>x.table_name)).size!==4 ||
      r.rows.some(x=>!TABLES.includes(x.table_name) ||
       x.schema_name!=="pay54"||
       x.rls_enabled!==true ||x.rls_forced!==true))deny();
   await client.query("COMMIT");started=false;
   return Object.freeze({
    schema:"pay54.real-postgres-rls-catalogue-review.v1",
    forceRlsTablesObserved:4,
    effectiveLoginToRoleMapsStillNeedProof:true,
    tenantCrossAccessNotTestedByThisQuery:true,
    actualStagingDeploymentNotAuthorised:true
   });
  }catch{
   if(client&&started)try{await client.query("ROLLBACK");}
   catch{discard=true;}
   deny();
  }finally{if(client)try{client.release(discard);}catch{}}
 };
}
export const PAY54_POSTGRES_RLS_OBSERVER_SQL=SQL;
