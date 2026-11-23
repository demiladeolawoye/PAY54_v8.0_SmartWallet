"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
 inspectPay54StagingDiscoverySources as inspect,
 inspectPay54StagingDiscoveryInCheckout as checkout,
 renderPay54StagingDiscoveryMarkdown as render
} from "../governance/pay54-batch40-staging-discovery.mjs";

const cloud=()=>({
 phase:"STG-04",scope:"OFFLINE_SOURCE_AUDIT",
 projectId:"pay54-staging-uk-01",
 stagingRelease:"BLOCKED",
 cloudProvisioning:"DISABLED",financialExecution:"DISABLED",
 controls:Array.from({length:11},(_,i)=>({
  id:`STG04-${String(i+1).padStart(2,"0")}`,
  result:i<3?"PASS":"NOT_VERIFIED"
 }))
});
const tf=()=>`provider "google" {
 region = "europe-west2"
}
variable "authorized_provisioning" {
 type=bool
 default=false
}`;
test("repository discovery is explicitly not cloud verification",()=>{
 const report=inspect({terraformSource:tf(),cloudReport:cloud()});
 assert.equal(report.schema,"pay54.staging-readonly-discovery.v1");
 assert.equal(report.sourceProjectReference,"pay54-staging-uk-01");
 assert.equal(report.managedPostgreSqlTerraformResourceDeclared,false);
 assert.equal(report.managedDatabaseActuallyExists,"NOT_VERIFIED");
 assert.equal(report.liveCloudAuthenticationPerformed,false);
 assert.equal(report.physicalDatabaseConnectionPerformed,false);
 assert.equal(report.secretPayloadsAccessed,false);
 assert.equal(report.authorizedCostIncurringActions,false);
 assert.equal(report.stagingDeploymentAuthorized,false);
 assert.equal(report.productionDeploymentAuthorized,false);
 assert.equal(report.financialExecutionAuthorized,false);
 assert.equal(report.independentlyVerifiedGates,0);
 assert.equal(report.gates.length,8);
 assert.ok(report.gates.every(g=>g.status==="NOT_INDEPENDENTLY_VERIFIED"));
 assert.ok(Object.isFrozen(report));
});
test("source-declared Cloud SQL resource does not verify a real instance",()=>{
 const report=inspect({terraformSource:tf()+
   '\nresource "google_sql_database_instance" "example" {}',
   cloudReport:cloud()});
 assert.equal(report.managedPostgreSqlTerraformResourceDeclared,true);
 assert.equal(report.managedDatabaseActuallyExists,"NOT_VERIFIED");
 assert.equal(report.stagingDeploymentAuthorized,false);
});
test("real checkout source audit remains non-activating",()=>{
 const report=checkout();
 assert.equal(report.sourceProjectReference,"pay54-staging-uk-01");
 assert.equal(report.terraformRegionDeclared,"europe-west2");
 assert.equal(report.managedDatabaseActuallyExists,"NOT_VERIFIED");
 assert.equal(report.stagingDeploymentAuthorized,false);
 const text=render(report);
 assert.match(text,/SOURCE AUDIT ONLY/);
 assert.match(text,/BLOCKED/);
 assert.match(text,/STG40-01/);
 assert.match(text,/STG40-08/);
 assert.doesNotMatch(text,/Staging APPROVED/);
});
for(const [label,transform] of [
 ["missing terraform",x=>({...x,terraformSource:null})],
 ["live release claim",x=>({...x,cloudReport:{...cloud(),stagingRelease:"APPROVED"}})],
 ["cloud provisioning claim",x=>({...x,cloudReport:{...cloud(),cloudProvisioning:"ENABLED"}})],
 ["money on",x=>({...x,cloudReport:{...cloud(),financialExecution:"ENABLED"}})],
 ["missing audit controls",x=>({...x,cloudReport:{...cloud(),controls:[]}})],
 ["failing source audit",x=>({...x,cloudReport:{...cloud(),
    controls:cloud().controls.map((c,i)=>i===0?{...c,result:"FAIL"}:c)}})],
 ["Terraform provisioning default true",x=>({...x,terraformSource:tf().replace(
  "default=false","default=true")})],
 ["wrong provider",x=>({...x,terraformSource:tf().replace(
  'provider "google"','provider "aws"')})]
]){
 test("fail closed on "+label,()=>{
  assert.throws(()=>inspect(transform({
   terraformSource:tf(),cloudReport:cloud()
  })),/PAY54_STAGING_DISCOVERY_SOURCE_DENIED/);
 });
}
test("cannot render forged release authorization",()=>{
 const base=inspect({terraformSource:tf(),cloudReport:cloud()});
 assert.throws(()=>render({...base,stagingDeploymentAuthorized:true}),
 /PAY54_STAGING_DISCOVERY_SOURCE_DENIED/);
 assert.throws(()=>render({...base,independentlyVerifiedGates:8}),
 /PAY54_STAGING_DISCOVERY_SOURCE_DENIED/);
});
