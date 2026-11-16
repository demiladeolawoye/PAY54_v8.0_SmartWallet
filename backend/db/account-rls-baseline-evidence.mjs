"use strict";

/*
 * PAY54 Batch 12 item 355 — read-only PostgreSQL privilege baseline.
 *
 * Catalog-only inspection to check that the explicitly NOLOGIN account
 * reader remains denied access to customer account tables. Does NOT run the
 * query or confer trust on caller-supplied results. Real environment peer
 * identity, TLS, database role and audit provenance require independent proof.
 */
const RELATIONS=Object.freeze([
 "account_contexts","account_memberships","personal_wallet_bindings"
]);
export const PAY54_ACCOUNT_RLS_BASELINE_SQL=Object.freeze([
 "SELECT c.relname::text AS relation_name,",
 "       c.relrowsecurity AS rls_enabled,",
 "       c.relforcerowsecurity AS rls_forced,",
 "       has_table_privilege('pay54_account_reader_role',c.oid,'SELECT') AS reader_select,",
 "       has_table_privilege('pay54_account_reader_role',c.oid,'INSERT') AS reader_insert,",
 "       has_table_privilege('pay54_account_reader_role',c.oid,'UPDATE') AS reader_update,",
 "       has_table_privilege('pay54_account_reader_role',c.oid,'DELETE') AS reader_delete,",
 "       has_table_privilege('pay54_account_reader_role',c.oid,'TRUNCATE') AS reader_truncate,",
 "       has_table_privilege('pay54_account_reader_role',c.oid,'REFERENCES') AS reader_references,",
 "       has_table_privilege('pay54_account_reader_role',c.oid,'TRIGGER') AS reader_trigger,",
 "       (c.relowner=(SELECT oid FROM pg_roles WHERE rolname='pay54_account_reader_role')) AS reader_owns_relation,",
 "       EXISTS (SELECT 1 FROM pg_policy p JOIN pg_roles r",
 "               ON r.oid=ANY(p.polroles)",
 "               WHERE p.polrelid=c.oid",
 "               AND r.rolname='pay54_account_reader_role'",
 "               AND p.polcmd='r' AND p.polpermissive=false",
 "               AND pg_get_expr(p.polqual,p.polrelid)='false') AS restrictive_reader_deny",
 "FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace",
 "WHERE n.nspname='pay54'",
 "AND c.relname IN ('account_contexts','account_memberships','personal_wallet_bindings')",
 "ORDER BY c.relname"
].join("\n"));

export const PAY54_ACCOUNT_ROLE_BASELINE_SQL=Object.freeze([
 "SELECT rolname::text AS role_name, rolcanlogin AS can_login,",
 "rolsuper AS superuser, rolbypassrls AS bypass_rls,",
 "rolinherit AS can_inherit, rolcreaterole AS can_create_role,",
 "(SELECT count(*)::integer FROM pg_auth_members",
 " WHERE roleid=pg_roles.oid OR member=pg_roles.oid) AS memberships_count",
 "FROM pg_roles WHERE rolname='pay54_account_reader_role'"
].join("\n"));

function plainRow(value){
 return value!==null && typeof value==="object" && !Array.isArray(value) &&
  Object.getPrototypeOf(value)===Object.prototype;
}
export function assessPay54AccountRlsBaseline({relations,role}={}){
 if(!Array.isArray(relations)||relations.length!==3||
    !plainRow(role)||role.role_name!=="pay54_account_reader_role"){
  throw new Error("PAY54_RLS_BASELINE_EVIDENCE_INVALID");
 }
 const seen=new Set();
 const findings=[];
 const booleanFields=["rls_enabled","rls_forced","reader_select",
  "reader_insert","reader_update","reader_delete","reader_truncate",
  "reader_references","reader_trigger","reader_owns_relation",
  "restrictive_reader_deny"];
 for(const item of relations){
  if(!plainRow(item)||!RELATIONS.includes(item.relation_name)||
     seen.has(item.relation_name)||
     booleanFields.some(field=>typeof item[field]!=="boolean")){
   throw new Error("PAY54_RLS_BASELINE_EVIDENCE_INVALID");
  }
  seen.add(item.relation_name);
  if(!item.rls_enabled||!item.rls_forced)
   findings.push("RLS_NOT_FORCED:"+item.relation_name);
  if(!item.restrictive_reader_deny)
   findings.push("RESTRICTIVE_DENY_MISSING:"+item.relation_name);
  if(item.reader_select||item.reader_insert||item.reader_update||item.reader_delete||
     item.reader_truncate||item.reader_references||item.reader_trigger||
     item.reader_owns_relation)
   findings.push("ACCOUNT_READER_TABLE_ACCESS:"+item.relation_name);
 }
 if(RELATIONS.some(name=>!seen.has(name))||
    ["can_login","superuser","bypass_rls","can_inherit","can_create_role"]
      .some(field=>typeof role[field]!=="boolean")||
    !Number.isSafeInteger(role.memberships_count)||role.memberships_count<0){
  throw new Error("PAY54_RLS_BASELINE_EVIDENCE_INVALID");
 }
 if(role.can_login||role.superuser||role.bypass_rls||
    role.can_inherit||role.can_create_role||role.memberships_count!==0){
  findings.push("READER_ROLE_ESCALATED");
 }
 return Object.freeze({
  observedSourceRows:relations.length,
  sourceBaselinePassed:findings.length===0,
  findings:Object.freeze(findings),
  customerReadAccessExpected:false,
  liveDatabaseIdentityIndependentlyVerified:false,
  catalogResultProvenanceVerified:false,
  customerDataAccessApproved:false,
  rlsActivationApproved:false,
  financialExecutionEnabled:false,
  release:"BLOCKED"
 });
}
