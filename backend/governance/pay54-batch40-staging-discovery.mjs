"use strict";

/**
 * PAY54 Batch 40: source-only cloud/PostgreSQL inventory.
 * Does not authenticate to GCP, call an API, access a secret, run Terraform,
 * connect to PostgreSQL, issue release approvals or activate wallet services.
 * No user-supplied or repository-declared identifier is runtime evidence.
 */
import {fileURLToPath} from "node:url";
import {auditStagingCloudReadiness,loadStagingCloudReadinessSources}
 from "../security/staging-cloud-readiness.mjs";

const DENIED="PAY54_STAGING_DISCOVERY_SOURCE_DENIED";
const refuse=()=>{throw Error(DENIED);};
const REQUIREMENTS=Object.freeze([
 ["STG40-01","Managed PostgreSQL provider/instance","Cloud/DB owner"],
 ["STG40-02","Effective GCP IAM and workload principal","Cloud Security"],
 ["STG40-03","Actual database LOGIN and role delegation","DBA"],
 ["STG40-04","Verified TLS hostname/CA and credential custody","DevSecOps"],
 ["STG40-05","Complete ledger writer and financial RLS compatibility","DBA + Fintech QA"],
 ["STG40-06","Provider settlement and approved spendable balance semantics","Compliance + Fintech"],
 ["STG40-07","Authenticated HTTP plus responsive accessibility acceptance","Backend + Mobile QA"],
 ["STG40-08","Deployment approval, monitoring and rehearsed rollback","Release Manager"]
]);
const freezeRow=(id,requirement,owner)=>Object.freeze({
 id,requirement,owner,status:"NOT_INDEPENDENTLY_VERIFIED",
 verifiedBy:null,evidenceReference:null
});
export function inspectPay54StagingDiscoverySources({terraformSource,cloudReport}={}){
 if(typeof terraformSource!=="string"||!cloudReport||
    cloudReport.phase!=="STG-04"||
    cloudReport.scope!=="OFFLINE_SOURCE_AUDIT"||
    cloudReport.stagingRelease!=="BLOCKED"||
    cloudReport.cloudProvisioning!=="DISABLED"||
    cloudReport.financialExecution!=="DISABLED"||
    !Array.isArray(cloudReport.controls)||
    cloudReport.controls.length!==11||
    !cloudReport.controls.every(c=>c&&
      ["PASS","FAIL","NOT_VERIFIED"].includes(c.result)))refuse();

 const declaredProjectId=cloudReport.projectId==="pay54-staging-uk-01"
  ?cloudReport.projectId:null;
 const gcpDeclared=/provider\s+"google"\s*\{/.test(terraformSource);
 const disabled=/variable\s+"authorized_provisioning"\s*\{[\s\S]*?default\s*=\s*false/.test(terraformSource);
 const london=/region\s*=\s*"europe-west2"/.test(terraformSource);
 const managedPgResourceDeclared=/resource\s+"google_sql_database_instance"\s+"/.test(terraformSource);
 if(!gcpDeclared||!disabled||!london||
    cloudReport.controls.some(x=>x.result==="FAIL"))refuse();

 const gates=Object.freeze(REQUIREMENTS.map(x=>freezeRow(...x)));
 return Object.freeze({
  schema:"pay54.staging-readonly-discovery.v1",
  reportScope:"REPOSITORY_SOURCE_ONLY",
  sourceProjectReference:declaredProjectId,
  terraformRegionDeclared:"europe-west2",
  providerSource:"google",
  managedPostgreSqlTerraformResourceDeclared:managedPgResourceDeclared,
  managedDatabaseActuallyExists:"NOT_VERIFIED",
  projectOwnershipVerified:false,
  liveCloudAuthenticationPerformed:false,
  physicalDatabaseConnectionPerformed:false,
  secretPayloadsAccessed:false,
  authorizedCostIncurringActions:false,
  unsignedExternalAssertionsAccepted:false,
  releaseApproverAuthenticated:false,
  independentlyVerifiedGates:0,
  gates,
  stagingDeploymentAuthorized:false,
  productionDeploymentAuthorized:false,
  financialExecutionAuthorized:false
 });
}
export function loadPay54StagingDiscoverySources(){
 const {terraformSource,...other}=loadStagingCloudReadinessSources();
 return Object.freeze({terraformSource,...other});
}
export function inspectPay54StagingDiscoveryInCheckout(){
 const sources=loadPay54StagingDiscoverySources();
 return inspectPay54StagingDiscoverySources({
  terraformSource:sources.terraformSource,
  cloudReport:auditStagingCloudReadiness(sources)
 });
}
export function renderPay54StagingDiscoveryMarkdown(report){
 if(report?.schema!=="pay54.staging-readonly-discovery.v1"||
    report.stagingDeploymentAuthorized!==false||
    report.productionDeploymentAuthorized!==false||
    report.financialExecutionAuthorized!==false||
    report.independentlyVerifiedGates!==0||
    report.gates?.length!==8)refuse();
 return [
  "## PAY54 Batch 40 — Read-only Staging Discovery",
  "",
  "**SOURCE AUDIT ONLY — NO LIVE CLOUD OR DATABASE ATTESTATION**",
  "",
  "| Source finding | Result |",
  "| --- | --- |",
  `| Terraform provider | ${report.providerSource} |`,
  `| Terraform region | ${report.terraformRegionDeclared} |`,
  `| Project identifier in source | ${report.sourceProjectReference??"UNVERIFIED"} |`,
  `| Managed PostgreSQL resource declared in reviewed main.tf | ${report.managedPostgreSqlTerraformResourceDeclared?"YES":"NO"} |`,
  "| Actual managed database existence | NOT VERIFIED |",
  "| Effective IAM / TLS / secret custody | NOT VERIFIED |",
  "| Staging release | BLOCKED |",
  "",
  "| Gate | Independent owner | Required evidence | Status |",
  "| --- | --- | --- | --- |",
  ...report.gates.map(g=>`| ${g.id} | ${g.owner} | ${g.requirement} | ${g.status} |`),
  "",
  "**No provisioning, database migration, live wallet balance or real-money execution authorised.**",
  ""
 ].join("\n");
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 process.stdout.write(renderPay54StagingDiscoveryMarkdown(
  inspectPay54StagingDiscoveryInCheckout()));
}
