"use strict";

/**
 * PAY54 Batch 25 / 979 — source-level GitHub publication workflow inventory.
 *
 * Detects workflows that could publish a site, assume cloud identity, change
 * secrets, or deploy. This is not a YAML interpreter, remote settings audit,
 * branch protection attestation or authorisation to change a workflow.
 */
import {readdirSync,readFileSync} from "node:fs";
import {resolve} from "node:path";
const deny=()=>{throw new Error("PAY54_RELEASE_WORKFLOW_AUDIT_DENIED");};
const filename=/^[a-z0-9][a-z0-9._-]*\.ya?ml$/i;
const patterns=Object.freeze({
 pagesWrite:/^\s+pages:\s*write\s*(?:#.*)?$/mi,
 idTokenWrite:/^\s+id-token:\s*write\s*(?:#.*)?$/mi,
 contentWrite:/^\s+contents:\s*write\s*(?:#.*)?$/mi,
 deployPages:/^\s*(?:-\s*)?uses:\s*actions\/deploy-pages@/mi,
 uploadPagesArtifact:/^\s*(?:-\s*)?uses:\s*actions\/upload-pages-artifact@/mi,
 cloudAuth:/^\s*(?:-\s*)?uses:\s*(?:google-github-actions\/auth|aws-actions\/configure-aws-credentials|azure\/login)@/mi,
 terraformApply:/^\s*(?:run:\s*)?(?:terraform|tofu)\s+apply\b/mi,
 pagesPublishBranch:/^\s*publish_branch:\s*\S+/mi
});
export function assessPay54ReleaseWorkflowSources({sources}={}){
 if(!sources || typeof sources!=="object" || Array.isArray(sources))deny();
 const files=Object.entries(sources);
 if(!files.length || files.length>500)deny();
 const observations=[];
 for(const [name,source] of files){
  if(!filename.test(name) ||
     typeof source!=="string" || !source.trim() ||
     source.length>2_000_000)deny();
  const flags=Object.entries(patterns)
   .filter(([,pattern])=>pattern.test(source)).map(([key])=>key);
  observations.push(Object.freeze({
   workflow:name,
   potentialDeploymentSignals:Object.freeze(flags),
   requiresIndependentReview:flags.length>0
  }));
 }
 observations.sort((a,b)=>a.workflow.localeCompare(b.workflow,"en"));
 return Object.freeze({
  schema:"pay54.release-workflow-source-inventory.v1",
  workflowCount:observations.length,
  potentialDeploymentWorkflowCount:observations.filter(x=>
   x.requiresIndependentReview).length,
  observations:Object.freeze(observations),
  branchProtectionVerified:false,
  pagesSettingsVerified:false,
  effectiveGithubTokenPermissionsVerified:false,
  deployerCloudIamVerified:false,
  productionReleaseAuthorised:false
 });
}
export function assessPay54TrackedReleaseWorkflowSources({
 directory=resolve(import.meta.dirname,"../../.github/workflows")
}={}){
 let names;
 try{names=readdirSync(directory);}catch{deny();}
 const sources=Object.create(null);
 for(const name of names){
  if(!filename.test(name))deny();
  try{sources[name]=readFileSync(resolve(directory,name),"utf8");}
  catch{deny();}
 }
 return assessPay54ReleaseWorkflowSources({sources});
}
