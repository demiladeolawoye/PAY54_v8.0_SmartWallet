"use strict";
/**
 * Batch27/1136 — actual DB catalogue query for restricted SECURITY DEFINERs.
 * Non-mutating and no runtime login privileges. Owner role must be NOLOGIN.
 */
const SQL=`SELECT p.proname AS function_name,p.prosecdef AS security_definer,
 r.rolname AS owner_role,r.rolcanlogin AS owner_can_login,
 r.rolbypassrls AS owner_bypass_rls,r.rolsuper AS owner_superuser
 FROM pg_proc p
 JOIN pg_namespace n ON n.oid=p.pronamespace
 JOIN pg_roles r ON r.oid=p.proowner
 WHERE n.nspname='pay54' AND p.proname=ANY($1::text[])
 ORDER BY p.proname`;
const EXPECT=Object.freeze({
 consume_identity_assertion_and_issue_bootstrap:"pay54_session_issue_executor_role",
 bind_initial_account_session:"pay54_session_rotate_executor_role",
 rotate_account_context_session:"pay54_session_rotate_executor_role"
});
const deny=()=>{throw Error("PAY54_SECURITY_DEFINER_CATALOGUE_DENIED");};
export async function inspectPay54SessionFunctionOwners({readPool}={}){
 if(typeof readPool?.connect!=="function")deny();
 let client,started=false,discard=false;
 try{
  client=await readPool.connect();
  if(typeof client?.query!=="function"||
     typeof client?.release!=="function")deny();
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  started=true;
  await client.query("SET LOCAL statement_timeout='5s'");
  const r=await client.query(SQL,[Object.keys(EXPECT)]);
  if(!Array.isArray(r?.rows)||r.rows.length!==3 ||
     new Set(r.rows.map(x=>x.function_name)).size!==3||
     r.rows.some(x=>EXPECT[x.function_name]!==x.owner_role ||
      x.security_definer!==true||x.owner_can_login!==false||
      x.owner_bypass_rls!==false||x.owner_superuser!==false))deny();
  await client.query("COMMIT");started=false;
  return Object.freeze({
   schema:"pay54.staging-session-definer-ownership.v1",
   restrictedFunctionCount:3,
   effectiveSqlPrivilegesBeyondOwnersNotVerified:true,
   actualStagingRlsPenetrationStillRequired:true,
   deploymentAuthorised:false
  });
 }catch{
  if(client&&started)try{await client.query("ROLLBACK");}
   catch{discard=true;}
  deny();
 }finally{if(client)try{client.release(discard);}catch{}}
}
export const PAY54_DEFINER_OWNER_SQL=SQL;
