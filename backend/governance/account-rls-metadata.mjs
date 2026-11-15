"use strict";

/* PostgreSQL 16 pg_policy metadata validator for three deny-only policies.
 * Consumes rows acquired by an independent read-only audit process.
 * Does not connect, apply migrations, grant rights or attest live databases.
 */
const EXPECTED=Object.freeze({
 pay54_reader_account_deny:"account_contexts",
 pay54_reader_membership_deny:"account_memberships",
 pay54_reader_wallet_binding_deny:"personal_wallet_bindings"
});
const expectedNames=Object.freeze(Object.keys(EXPECTED));

export const ACCOUNT_RLS_METADATA_QUERY=[
 "SELECT p.polname, c.relname, n.nspname, p.polpermissive,",
 "p.polcmd, pg_get_expr(p.polqual, p.polrelid) AS expression,",
 "ARRAY(SELECT r.rolname FROM pg_roles r WHERE r.oid=ANY(p.polroles)) AS roles,",
 "c.relrowsecurity, c.relforcerowsecurity",
 "FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid",
 "JOIN pg_namespace n ON n.oid=c.relnamespace",
 "WHERE n.nspname='pay54' AND p.polname LIKE 'pay54_reader_%'",
 "ORDER BY p.polname"
].join("\n");

export function validateAccountRlsMetadata(rows) {
 if(!Array.isArray(rows)||rows.length!==expectedNames.length) {
   return Object.freeze({passed:false,issues:Object.freeze(["POLICY_COUNT_MISMATCH"]),liveAttested:false});
 }
 const seen=new Set(),issues=[];
 for(const row of rows){
   if(!row||typeof row.polname!=="string"||
     !Object.hasOwn(EXPECTED,row.polname)||seen.has(row.polname)){
     issues.push("POLICY_IDENTITY_INVALID");continue;
   }
   seen.add(row.polname);
   if(row.relname!==EXPECTED[row.polname]||row.nspname!=="pay54"){
     issues.push("WRONG_RELATION_"+row.polname);
   }
   if(row.polpermissive!==false||row.polcmd!=="r"||
     row.expression!=="false"||row.relrowsecurity!==true||
     row.relforcerowsecurity!==true||
     !Array.isArray(row.roles)||row.roles.length!==1||
     row.roles[0]!=="pay54_account_reader_role"){
     issues.push("UNSAFE_POLICY_"+row.polname);
   }
 }
 for(const name of expectedNames)if(!seen.has(name))issues.push("MISSING_"+name);
 return Object.freeze({passed:issues.length===0,issues:Object.freeze(issues),
   liveAttested:false,sourceOnly:true});
}
