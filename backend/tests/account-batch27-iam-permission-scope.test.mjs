"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54DeployerPermissionScope as inspect}
 from "../governance/pay54-batch27-iam-permission-scope.mjs";
const projectId="pay54-staging-secure";
test("1117: limited source-declared roles never imply effective cloud IAM",()=>{
 const r=inspect({projectId,bindings:["roles/run.viewer"]});
 assert.equal(r.requestedScopePassesDenylist,true);
 assert.equal(r.realCloudIamPolicyRetrieved,false);
 assert.equal(r.productionDeploymentAuthorised,false);
});
test("1117: owner, editor, secrets, token-creator and SQL admin flagged",()=>{
 const bindings=["roles/owner","roles/editor",
  "roles/secretmanager.secretAccessor","roles/cloudsql.admin"];
 const r=inspect({projectId,bindings});
 assert.equal(r.requestedScopePassesDenylist,false);
 assert.equal(r.explicitHighPrivilegeRoles.length,4);
 assert.throws(()=>inspect({projectId,bindings:[
  "roles/run.viewer","roles/run.viewer"]}),/DEPLOYER_PERMISSION_SCOPE_DENIED/);
});
