"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {assessPay54StagingTrustSource} from "../governance/pay54-staging-trust-source.mjs";

const terraformSource=readFileSync(new URL("../../infrastructure/staging/main.tf",import.meta.url),"utf8");
const workflowSource=readFileSync(new URL("../../.github/workflows/pay54-staging-deploy.yml",import.meta.url),"utf8");
const source={terraformSource,workflowSource};
test("292: current source staging trust remains disabled and release blocked",()=>{
 const result=assessPay54StagingTrustSource(source);
 assert.equal(result.sourceTrustPolicyPassed,true,
  JSON.stringify(result.checks.filter(x=>!x.passed)));
 assert.equal(result.actualCloudIdentityVerified,false);
 assert.equal(result.cloudProvisioningAuthorized,false);
 assert.equal(result.financialExecutionAuthorized,false);
 assert.equal(result.productionRelease,"BLOCKED");
 assert.ok(Object.isFrozen(result.checks));
});
test("292: cloud/identity and public ingress downgrades are detected",()=>{
 const changes=[
  ["terraformSource",s=>s.replace("disabled = true","disabled = false")],
  ["terraformSource",s=>s.replace("default     = false","default     = true")],
  ["terraformSource",s=>s.replace("INGRESS_TRAFFIC_INTERNAL_ONLY","INGRESS_TRAFFIC_ALL")],
  ["terraformSource",s=>s.replace("invoker_iam_disabled = false","invoker_iam_disabled = true")],
  ["terraformSource",s=>s.replace("assertion.repository_id ==","assertion.repository_id removed ==")],
  ["terraformSource",s=>s+"\nresource \"google_compute_router_nat\" \"oops\" {}\n"],
  ["workflowSource",s=>s.replace("persist-credentials: false","persist-credentials: true")],
  ["workflowSource",s=>s.replace('TF_VAR_authorized_provisioning: "false"','TF_VAR_authorized_provisioning: "true"')],
  ["workflowSource",s=>s.replace("contents: read","contents: write")],
  ["workflowSource",s=>s+"\n    - uses: google-github-actions/auth@v3\n"],
  ["workflowSource",s=>s+"\n      run: terraform apply -auto-approve\n"]
 ];
 for(const [name,change] of changes){
  const modified=change(source[name]);
  assert.notEqual(modified,source[name],"Mutation must change "+name);
  const result=assessPay54StagingTrustSource({...source,[name]:modified});
  assert.equal(result.sourceTrustPolicyPassed,false,
   "Mutation was undetected for "+name);
 }
});
test("292: missing or excessive source is refused",()=>{
 for(const value of [{},{terraformSource:"a",workflowSource:"b"},
  {terraformSource:"x".repeat(500001),workflowSource}]){
  assert.throws(()=>assessPay54StagingTrustSource(value),
   /PAY54_STAGING_TRUST_SOURCE_INVALID/);
 }
});
