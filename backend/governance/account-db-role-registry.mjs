"use strict";

/* Reviewer-controlled immutable identity mapping metadata.
 * Never constructs SET ROLE commands or issues database grants.
 * A mapping here alone does not authenticate a DB connection.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROLE=/^pay54_tenant_[a-z0-9_]{8,48}$/;
export function createAccountDbRoleRegistry({rows}) {
 if(!Array.isArray(rows)||rows.length>1000)throw new TypeError("DB_ROLE_REGISTRY_INVALID");
 const subjectToRole=new Map(),seenRoles=new Set();
 for(const row of rows){
  if(!row||typeof row.subjectId!=="string"||!UUID.test(row.subjectId)||
      typeof row.roleName!=="string"||!ROLE.test(row.roleName)||
      row.active!==true || Object.keys(row).sort().join(",")!=="active,roleName,subjectId"){
   throw new TypeError("DB_ROLE_REGISTRY_INVALID");
  }
  const subject=row.subjectId.toLowerCase();
  if(subjectToRole.has(subject)||seenRoles.has(row.roleName)){
   throw new TypeError("DB_ROLE_REGISTRY_DUPLICATE");
  }
  subjectToRole.set(subject,row.roleName);
  seenRoles.add(row.roleName);
 }
 return Object.freeze({
  assertMapping(subjectId,roleName){
   if(typeof subjectId!=="string"||!UUID.test(subjectId))return false;
   return subjectToRole.get(subjectId.toLowerCase())===roleName;
  },
  expectedRole(subjectId){
   return typeof subjectId==="string"&&UUID.test(subjectId)?
     subjectToRole.get(subjectId.toLowerCase())??null:null;
  },
  size:subjectToRole.size,
  liveDbVerified:false
 });
}
