"use strict";

/* Pinned read-only PostgreSQL role-introspection SQL. It proves only what the
 * returned DB session says; a privileged connection can still lie using mocks
 * or proxy infrastructure. Never use this as live trust attestation alone.
 */
export const ACCOUNT_ACTOR_ATTESTATION_SQL=[
 "SELECT current_user::text AS current_user_name,",
 "session_user::text AS session_user_name,",
 "r.rolcanlogin AS can_login, r.rolsuper AS superuser,",
 "r.rolbypassrls AS bypass_rls, r.rolinherit AS inherit,",
 "r.rolcreaterole AS create_role, r.rolcreatedb AS create_db,",
 "r.rolreplication AS replication,",
 "(SELECT count(*)::integer FROM pg_auth_members m",
 " WHERE m.roleid=r.oid OR m.member=r.oid) AS memberships_count,",
 "current_setting('row_security')='on' AS row_security_enabled,",
 "(SELECT count(*)::integer FROM pg_class c",
 " JOIN pg_namespace n ON n.oid=c.relnamespace",
 " WHERE n.nspname='pay54' AND c.relowner=r.oid) AS customer_table_ownership_count",
 "FROM pg_roles r WHERE r.rolname=current_user"
].join("\n");

export function projectAccountActorAttestation(result){
 if(!result||!Array.isArray(result.rows)||result.rows.length!==1){
  throw new Error("ACTOR_ATTESTATION_UNAVAILABLE");
 }
 const r=result.rows[0];
 if(!r||typeof r!=="object"||
    typeof r.current_user_name!=="string"||typeof r.session_user_name!=="string"||
    !Number.isInteger(r.memberships_count)||r.memberships_count<0||
    !Number.isInteger(r.customer_table_ownership_count)||r.customer_table_ownership_count<0){
  throw new Error("ACTOR_ATTESTATION_UNAVAILABLE");
 }
 for(const f of ["can_login","superuser","bypass_rls","inherit","create_role",
  "create_db","replication","row_security_enabled"]){
  if(typeof r[f]!=="boolean")throw new Error("ACTOR_ATTESTATION_UNAVAILABLE");
 }
 return Object.freeze({
  roleName:r.current_user_name,currentUser:r.current_user_name,
  sessionUser:r.session_user_name,canLogin:r.can_login,superuser:r.superuser,
  bypassRls:r.bypass_rls,inherit:r.inherit,createRole:r.create_role,
  createDb:r.create_db,replication:r.replication,
  membershipsCount:r.memberships_count,
  rowSecurityEnabled:r.row_security_enabled,
  isOwnerOfCustomerTables:r.customer_table_ownership_count!==0
 });
}
