"use strict";

/* PAY54 source-only audit of Postgres role/privilege inventory.
 * Consumes an independently supplied read-only snapshot; does not connect.
 */
const NAME="pay54_account_reader_role";
const FLAGS=["rolcanlogin","rolsuper","rolinherit","rolbypassrls","rolcreatedb","rolcreaterole","rolreplication"];
export function assessAccountReaderRoleInventory(snapshot){
  if(!snapshot||typeof snapshot!=="object"||!Array.isArray(snapshot.roles)||
     !Array.isArray(snapshot.memberships)||!Array.isArray(snapshot.grants)){
    throw new TypeError("ACCOUNT_ROLE_EVIDENCE_REQUIRED");
  }
  const matches=snapshot.roles.filter(role=>role?.rolname===NAME);
  const reasons=[];
  if(matches.length!==1)reasons.push("MISSING_OR_DUPLICATE_READER");
  const role=matches[0];
  if(role){
    for(const flag of FLAGS)if(role[flag]!==false)reasons.push("UNSAFE_"+flag.toUpperCase());
    if(!Number.isSafeInteger(role.oid)||role.oid<1)reasons.push("MISSING_ROLE_OID");
    if(snapshot.memberships.some(m=>m?.roleid===role.oid||m?.member===role.oid)){
      reasons.push("READER_MEMBERSHIP_PRESENT");
    }
    if(snapshot.grants.some(g=>g?.grantee===NAME&&g?.privilege!=="USAGE_SCHEMA")){
      reasons.push("READER_DATA_PRIVILEGE");
    }
  }
  return Object.freeze({passed:reasons.length===0,reasons:Object.freeze(reasons),
   sourceOnly:true,financialExecutionEnabled:false,liveRoleAttested:false});
}
