"use strict";

import {requireTrustedPrincipal} from "../domain/trusted-account-principal.mjs";

/* PAY54 Batch 08 / metadata only. This opaque descriptor is not a
 * PostgreSQL credential or proof that the database has authenticated a role.
 */
const ROLE=/^pay54_tenant_[a-z0-9_]{8,48}$/;
const issued=new WeakSet();

export function createAccountDbPrincipal({principal,roleName,assertRoleMapping}) {
  const principalId=requireTrustedPrincipal(principal);
  if(typeof roleName!=="string"||!ROLE.test(roleName)||
     typeof assertRoleMapping!=="function")throw new Error("DB_PRINCIPAL_DENIED");
  if(assertRoleMapping(principalId,roleName)!==true)throw new Error("DB_PRINCIPAL_DENIED");
  const descriptor=Object.freeze({principalId,roleName,
    verifiedSource:"SERVER_SESSION",requiresDatabaseActorVerification:true,
    grantsDatabasePrivileges:false,financialExecutionEnabled:false});
  issued.add(descriptor);
  return descriptor;
}

export function requireAccountDbPrincipal(value) {
  if(!value||typeof value!=="object"||!issued.has(value)){
    throw new Error("DB_PRINCIPAL_DENIED");
  }
  return value;
}
