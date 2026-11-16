"use strict";

/*
 * PAY54 Batch 11 item 298 — conservative workflow source trust review.
 * A source heuristic is NOT a YAML parser, GitHub permissions evaluator,
 * branch protection verification or runtime attestation. It can detect
 * high-risk patterns and refuse a "clean" result if assessment is incomplete.
 * No network, cloud, credentials, deployment or shell execution.
 */
const PATH=/^\.github\/workflows\/[a-z0-9_.-]+\.ya?ml$/i;
const MAX_WORKFLOWS=150, MAX_BYTES=250000;
function sourceLines(source){
 return source.split(/\r?\n/).filter(line=>!line.trimStart().startsWith("#"));
}
function hasLine(text,regex){return regex.test(text);}
export function assessPay54PullRequestWorkflowTrust({workflows}={}){
 if(!Array.isArray(workflows)||workflows.length<1||workflows.length>MAX_WORKFLOWS){
  throw new TypeError("PAY54_WORKFLOW_TRUST_INVENTORY_INVALID");
 }
 const visited=new Set(), results=[];
 for(const file of workflows){
  if(file===null||typeof file!=="object"||Array.isArray(file)||
     typeof file.path!=="string"||!PATH.test(file.path)||
     typeof file.content!=="string"||file.content.length>MAX_BYTES||
     visited.has(file.path)){
   throw new TypeError("PAY54_WORKFLOW_TRUST_INVENTORY_INVALID");
  }
  visited.add(file.path);
  const source=sourceLines(file.content).join("\n");
  const pullRequestTarget=hasLine(source,/^\s{2}pull_request_target\s*:/m);
  const workflowRun=hasLine(source,/^\s{2}workflow_run\s*:/m);
  const untrustedPullRequest=hasLine(source,/^\s{2}pull_request\s*:/m);
  const checkout=hasLine(source,/^\s*-\s*uses:\s*actions\/checkout@/m);
  const credentialPersistenceDisabled=hasLine(source,/^\s*persist-credentials:\s*false\s*$/m);
  const writePermission=hasLine(source,/^\s*(?:contents|actions|checks|deployments|packages|pull-requests|id-token):\s*write\s*$/m);
  const secretsReference=hasLine(source,/\$\{\{\s*secrets\./);
  const cloudIdentity=hasLine(source,/\b(?:google-github-actions\/auth|aws-actions\/configure-aws-credentials|azure\/login)@/);
  const untrustedExpression=hasLine(source,/\x24\{\{\s*github\.(?:event\.pull_request\.(?:title|body|head\.ref|head\.label)|head_ref|event\.workflow_run\.(?:head_branch|display_title))\b/);
  const dangerousBuildContext=(pullRequestTarget||workflowRun)&&(
    checkout||secretsReference||cloudIdentity||writePermission
  );
  const potentialWorkflowRisk=Boolean(dangerousBuildContext||
    (untrustedPullRequest&&(secretsReference||cloudIdentity||writePermission))||
    (checkout&&!credentialPersistenceDisabled)||
    ((pullRequestTarget||untrustedPullRequest||workflowRun)&&untrustedExpression));
  results.push(Object.freeze({
    path:file.path,
    pullRequestTarget,
    workflowRun,
    untrustedPullRequest,
    checkoutDetected:checkout,
    credentialPersistenceDisabled,
    writePermissionDetected:writePermission,
    secretsReferenceDetected:secretsReference,
    cloudIdentityDetected:cloudIdentity,
    untrustedExpressionDetected:untrustedExpression,
    needsIndependentReview:potentialWorkflowRisk
  }));
 }
 return Object.freeze({
  workflowsReviewed:results.length,
  findings:Object.freeze(results),
  highRiskWorkflowCount:results.filter(x=>x.needsIndependentReview).length,
  sourceHeuristicsClear:results.every(x=>!x.needsIndependentReview),
  yamlSemanticsIndependentlyVerified:false,
  githubEnvironmentRulesVerified:false,
  protectedBranchSettingsVerified:false,
  releaseAuthorized:false,
  customerDataAccessEnabled:false,
  financialExecutionEnabled:false,
  productionRelease:"BLOCKED"
 });
}
