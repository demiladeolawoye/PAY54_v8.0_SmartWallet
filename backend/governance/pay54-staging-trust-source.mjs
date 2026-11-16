"use strict";

/*
 * PAY54 Batch 11 item 291 — offline staging trust regression gate.
 * This validates committed source shape only. It neither authenticates
 * an external cloud service nor authorises deployment/provisioning.
 */

const EXPECTED_REPOSITORY="demiladeolawoye/PAY54_v8.0_SmartWallet";
const EXPECTED_BRANCH="refs/heads/project-titan";
const REQUIRED_TF=[
 ["PROVISIONING_DEFAULT_OFF",/variable\s+"authorized_provisioning"\s*\{[^}]*default\s*=\s*false/s],
 ["GATED_RESOURCES",/enabled\s*=\s*var\.authorized_provisioning/],
 ["WIF_DISABLED",/resource\s+"google_iam_workload_identity_pool_provider"\s+"github"\s*\{[\s\S]*?disabled\s*=\s*true/],
 ["TRUST_REPOSITORY_ID",/assertion\.repository_id\s*==/],
 ["TRUST_OWNER_ID",/assertion\.repository_owner_id\s*==/],
 ["TRUST_WORKFLOW",/assertion\.workflow_ref\s*==/],
 ["TRUST_EVENT",/assertion\.event_name\s*==/],
 ["TRUST_ENVIRONMENT",/assertion\.environment\s*==/],
 ["STAGING_INTERNAL_INGRESS",/ingress\s*=\s*"INGRESS_TRAFFIC_INTERNAL_ONLY"/],
 ["STAGING_AUTH_REQUIRED",/invoker_iam_disabled\s*=\s*false/],
 ["LONDON_REGION",/region\s*=\s*"europe-west2"/],
 ["EGRESS_RESTRICTED",/egress\s*=\s*"ALL_TRAFFIC"/]
];
const REQUIRED_WORKFLOW=[
 ["READ_ONLY_PERMISSIONS",/^permissions:\s*\n\s+contents:\s*read\s*$/m],
 ["PERSIST_CREDENTIALS_OFF",/persist-credentials:\s*false/],
 ["PROVISIONING_DISABLED",/TF_VAR_authorized_provisioning:\s*"false"/],
 ["STAGING_EXECUTION_DISABLED",/PAY54_STAGING_EXECUTION:\s*"DISABLED"/],
 ["MONEY_DISABLED",/PAY54_FINANCIAL_EXECUTION:\s*"false"/],
 ["BRANCH_GUARD",/refs\/heads\/project-titan/],
 ["REPOSITORY_GUARD",/demiladeolawoye\/PAY54_v8\.0_SmartWallet/]
];
const FORBIDDEN_WORKFLOW=[
 ["TOKEN_WRITE",/^\s*(?:id-token|contents|actions|deployments|packages):\s*write\s*$/m],
 ["CLOUD_AUTH",/uses:\s*google-github-actions\/auth@/],
 ["SECRETS",/\$\{\{\s*secrets\./],
 ["ENVIRONMENT_PROMOTION",/^\s*environment:\s*(?:pay54-staging|production)\s*$/m],
 ["TERRAFORM_APPLY",/\bterraform\s+(?:apply|destroy|import)\b/i],
 ["CONTAINER_PUBLISH",/\bdocker\s+push\b/i]
];
const FORBIDDEN_TF=[
 ["PUBLIC_INVOCATION",/member\s*=\s*"(?:allUsers|allAuthenticatedUsers)"/],
 ["PUBLIC_INGRESS",/ingress\s*=\s*"INGRESS_TRAFFIC_ALL"/],
 ["CLOUD_NAT",/resource\s+"google_compute_router_nat"/],
 ["ELEVATED_ROLES",/roles\/(?:owner|editor|run\.admin|artifactregistry\.admin)/]
];

export function assessPay54StagingTrustSource({
  terraformSource,workflowSource
}={}){
 if(typeof terraformSource!=="string"||typeof workflowSource!=="string"||
    terraformSource.length<100||workflowSource.length<100||
    terraformSource.length>500000||workflowSource.length>150000){
  throw new TypeError("PAY54_STAGING_TRUST_SOURCE_INVALID");
 }
 const checks=[
  ...REQUIRED_TF.map(([name,rule])=>({name,passed:rule.test(terraformSource)})),
  ...REQUIRED_WORKFLOW.map(([name,rule])=>({name,passed:rule.test(workflowSource)})),
  ...FORBIDDEN_TF.map(([name,rule])=>({name,passed:!rule.test(terraformSource)})),
  ...FORBIDDEN_WORKFLOW.map(([name,rule])=>({name,passed:!rule.test(workflowSource)}))
 ];
 const frozen=Object.freeze(checks.map(x=>Object.freeze(x)));
 return Object.freeze({
  repository:EXPECTED_REPOSITORY,
  branch:EXPECTED_BRANCH,
  checks:frozen,
  sourceTrustPolicyPassed:frozen.every(x=>x.passed),
  independentTrustAttestation:false,
  actualGitHubEnvironmentVerified:false,
  actualCloudIdentityVerified:false,
  cloudProvisioningAuthorized:false,
  releaseAuthorized:false,
  financialExecutionAuthorized:false,
  productionRelease:"BLOCKED"
 });
}
