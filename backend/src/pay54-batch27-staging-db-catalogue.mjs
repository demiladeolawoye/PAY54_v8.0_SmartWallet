"use strict";
/**
 * Batch27/1110 — read-only effective DB role and membership observer.
 * Connection is supplied by a separately approved staging pool. No DDL,
 * role grants, migrations, customer data or ledger DML can be attempted.
 */
const SQL=`SELECT r.rolname AS role,
 r.rolcanlogin AS can_login,
 r.rolsuper AS superuser,
 r.rolbypassrls AS bypass_rls,
 r.rolinherit AS inherits,
 (SELECT count(*)::integer FROM pg_auth_members am
  WHERE am.roleid=r.oid) AS member_count
 FROM pg_roles r
 WHERE r.rolname=ANY($1::text[])
 ORDER BY r.rolname`;
const ROLES=Object.freeze([
 "pay54_session_read_role",
 "pay54_account_directory_read_role",
 "pay54_session_rotate_role",
 "pay54_session_issue_role"
]);
const deny=()=>{throw new Error("PAY54_STAGING_DB_CATALOGUE_DENIED");};
export function createPay54StagingDbCatalogueObserver({readPool}={}){
 if(typeof readPool?.connect!=="function")deny();
 return async function observe(){
  let client,started=false,discard=false;
  try{
   client=await readPool.connect();
   if(!client||typeof client.query!=="function"||
      typeof client.release!=="function")deny();
   await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
   started=true;
   await client.query("SET LOCAL statement_timeout='5s'");
   await client.query("SET LOCAL lock_timeout='2s'");
   const result=await client.query(SQL,[ROLES]);
   if(!Array.isArray(result?.rows)||result.rows.length!==4)deny();
   const seen=new Set();
   for(const r of result.rows){
    if(!ROLES.includes(r.role)||seen.has(r.role)||
       r.can_login!==false||r.superuser!==false||
       r.bypass_rls!==false||r.inherits!==false ||
       !Number.isInteger(r.member_count)||r.member_count<0)deny();
    seen.add(r.role);
   }
   await client.query("COMMIT");
   started=false;
   return Object.freeze({
    schema:"pay54.staging-pg-catalogue-observation.v1",
    checkedRoleCount:4,
    observedMembershipCounts:Object.freeze(result.rows.map(r=>({
     role:r.role,count:r.member_count
    }))),
    roleMembersIndependentlyAuthorised:false,
    runtimeLoginPermissionsProven:false,
    realStagingStatusRequiresSeparateVerification:true,
    productionReleaseAuthorised:false
   });
  }catch{
   if(client&&started){try{await client.query("ROLLBACK");}
     catch{discard=true;}}
   deny();
  }finally{
   if(client)try{client.release(discard);}catch{}
  }
 };
}
export const PAY54_STAGING_CATALOGUE_SQL=SQL;
