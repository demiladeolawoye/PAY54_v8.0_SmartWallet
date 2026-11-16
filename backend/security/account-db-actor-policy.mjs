"use strict";

/* Source-only PG actor metadata checks. Query snapshots are supplied by a
 * separately trusted read-only introspection process, NOT by the client.
 */
const NAME=/^pay54_tenant_[a-z0-9_]{8,48}$/;
export function assertAccountDbActorPolicy({expectedRole,metadata}){
 if(typeof expectedRole!=="string"||!NAME.test(expectedRole)||
    !metadata||typeof metadata!=="object"||Array.isArray(metadata)||
    metadata.roleName!==expectedRole||
    metadata.currentUser!==expectedRole||
    metadata.sessionUser!==expectedRole||
    metadata.canLogin!==true||
    metadata.superuser!==false||
    metadata.bypassRls!==false||
    metadata.inherit!==false||
    metadata.createRole!==false||
    metadata.createDb!==false||
    metadata.replication!==false||
    metadata.isOwnerOfCustomerTables!==false||
    metadata.hasFinancialPrivilege!==false||
    metadata.canAssumeOtherTenantRoles!==false||
    metadata.membershipsCount!==0||
    metadata.rowSecurityEnabled!==true||
    metadata.inTransaction!==true){
  throw new Error("ACCOUNT_DB_ACTOR_UNTRUSTED");
 }
 return Object.freeze({roleName:expectedRole,readOnlyEligible:true,
  liveCredentialAttested:false,financialExecutionEnabled:false});
}
