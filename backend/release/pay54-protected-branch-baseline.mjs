"use strict";

/**
 * PAY54 Batch 28 / 1236 — protected-branch CI source contract.
 *
 * This is a NON-DEPLOYING baseline: it must run for every PR targeting main,
 * project-titan, or the Batch27 stack review branch, regardless of paths.
 * The last target is temporary until the source has been independently
 * reviewed and landed on both protected branches.
 */
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";

const WORKFLOW=".github/workflows/pay54-protected-branch-baseline.yml";
const SHA=/^[a-f0-9]{40}$/;
const deny=()=>{throw Error("PAY54_PROTECTED_BRANCH_BASELINE_DENIED");};
const BANNED_ACTIONS=/\b(?:deploy-pages|upload-pages-artifact|configure-pages|azure\/login|aws-actions\/configure-aws-credentials|google-github-actions\/auth|hashicorp\/setup-terraform)@/i;
const PERMISSIONS=/^permissions:\s*\n\s+contents:\s*read\s*$/m;
const JOB=/^\s{2}protected-branch-security:\s*\n\s{4}name:\s*PAY54 Protected Branch Security\s*$/m;
const TRIGGERS=/^on:\s*\n\s{2}pull_request:\s*\n\s{4}branches:\s*\n\s{6}- main\s*\n\s{6}- project-titan\s*\n\s{6}- cto\/batch27-operational-evidence-1068-1187\s*\n\s{2}workflow_dispatch:\s*\n/m;

export function verifyPay54ProtectedBranchBaseline({workflow}={}){
 if(typeof workflow!=="string"||workflow.length<450||
    workflow.length>12000||!TRIGGERS.test(workflow)||
    !PERMISSIONS.test(workflow)||!JOB.test(workflow)||
    /(^|\n)\s+(?:paths|paths-ignore|types):/.test(workflow)||
    /(^|\n)\s+pull_request_target:/.test(workflow)||
    /(^|\n)\s+workflow_run:/.test(workflow)||
    /(^|\n)\s+id-token:\s*write/.test(workflow)||
    /(^|\n)\s+contents:\s*write/.test(workflow)||
    /(^|\n)\s+packages:\s*write/.test(workflow)||
    BANNED_ACTIONS.test(workflow)||
    /\b(?:npm\s+publish|gh\s+pr\s+merge|git\s+push|terraform\s+apply|kubectl\s+apply)\b/.test(workflow))deny();
 const uses=[...workflow.matchAll(/^\s+- uses:\s*([^\s#]+)\s*$/gm)].map(x=>x[1]);
 if(uses.length!==2||
    uses.some(x=>!/^(?:actions\/checkout|actions\/setup-node)@[a-f0-9]{40}$/.test(x))||
    !uses[0].startsWith("actions/checkout@")||
    !uses[1].startsWith("actions/setup-node@") ||
    !workflow.includes("persist-credentials: false")||
    !workflow.includes('PAY54_REAL_MONEY_MODE: "false"')||
    !workflow.includes('TF_VAR_authorized_provisioning: "false"') ||
    !workflow.includes("node --test backend/tests/account-batch28-protected-branch-baseline.test.mjs")||
    !workflow.includes("git diff --check")||
    !workflow.includes("fetch-depth: 0"))deny();
 return Object.freeze({
  schema:"pay54.protected-branch-required-ci-source.v1",
  jobContext:"PAY54 Protected Branch Security",
  prTargets:Object.freeze(["main","project-titan","cto/batch27-operational-evidence-1068-1187"]),
  pathsFiltered:false,
  sourceActionsPinned:true,
  nonDeploying:true,
  requiredCheckConfiguredInGithub:false,
  targetBaseBranchesActuallyTested:false,
  rulesetEnforcementAuthorised:false,
  productionReleaseAuthorised:false
 });
}
export function inspectPay54ProtectedBranchBaselineCheckout({
 cwd=resolve(fileURLToPath(new URL("../../",import.meta.url)))
}={}){
 if(typeof cwd!=="string")deny();
 let src;
 try{src=readFileSync(resolve(cwd,WORKFLOW),"utf8");}catch{deny();}
 return verifyPay54ProtectedBranchBaseline({workflow:src});
}
export function verifyPay54PrDiffIdentity({
 eventName,sourceSha,baseSha,actualSha
}={}){
 if(eventName!=="pull_request" &&
    eventName!=="workflow_dispatch")deny();
 if(!SHA.test(actualSha??"") ||
    (eventName==="pull_request" &&
      (!SHA.test(sourceSha??"")||!SHA.test(baseSha??"")||
       sourceSha!==actualSha)))deny();
 return Object.freeze({
  schema:"pay54.protected-branch-source-identity.v1",
  exactPrSourceVerified:eventName==="pull_request",
  gitDiffWhitespaceReviewRequired:eventName==="pull_request",
  deployerAndCloudPermissionsGranted:false,
  productionReleaseAuthorised:false
 });
}
