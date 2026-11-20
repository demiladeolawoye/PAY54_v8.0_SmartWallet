"use strict";
/** Batch27/1116 — review scope of deployer IAM, never grant privileges. */
const deny=()=>{throw Error("PAY54_DEPLOYER_PERMISSION_SCOPE_DENIED");};
const DENY=new Set(["roles/owner","roles/editor",
 "roles/iam.serviceAccountTokenCreator","roles/secretmanager.secretAccessor",
 "roles/cloudsql.admin","roles/storage.admin"]);
const REQUIRED=new Set(["roles/storage.objectViewer",
 "roles/run.viewer"]);
export function inspectPay54DeployerPermissionScope({
 projectId,bindings
}={}){
 if(typeof projectId!=="string"||
    !/^[a-z][a-z0-9-]{5,29}$/.test(projectId) ||
    !Array.isArray(bindings)||bindings.length>100)deny();
 const seen=new Set(),dangerous=[];
 for(const role of bindings){
  if(typeof role!=="string"||!/^roles\/[a-zA-Z0-9.]+$/.test(role)||
    seen.has(role))deny();
  seen.add(role);
  if(DENY.has(role))dangerous.push(role);
 }
 return Object.freeze({
  schema:"pay54.deployer-iam-scope-review.v1",
  projectId,declaredRoleCount:bindings.length,
  explicitHighPrivilegeRoles:Object.freeze(dangerous),
  requestedScopePassesDenylist:dangerous.length===0,
  realCloudIamPolicyRetrieved:false,
  iamBindingChangesPerformed:false,
  cloudTokenIssued:false,
  productionDeploymentAuthorised:false
 });
}
