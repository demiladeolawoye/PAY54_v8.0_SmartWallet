"use strict";

/**
 * PAY54 item 631 — repository-declared Pages workflow inventory.
 *
 * Scans local CI workflow source only. It cannot establish current Pages
 * Settings, deployment owner, or which workflow GitHub's control plane runs.
 */
import {readdirSync,readFileSync,lstatSync} from "node:fs";
import {join,resolve} from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const MAX_WORKFLOWS=120,MAX_BYTES=250_000;
export function inspectPay54DeclaredPagesWorkflows(root=ROOT){
 const folder=join(resolve(root),".github/workflows");
 const files=[];
 let entries=[];
 try{entries=readdirSync(folder,{withFileTypes:true});}
 catch(error){
  if(error?.code!=="ENOENT")throw error;
 }
 if(entries.length>MAX_WORKFLOWS){
  throw new Error("PAY54_WORKFLOW_SOURCE_COUNT_EXCEEDED");
 }
 for(const item of entries){
  if(!/\.ya?ml$/i.test(item.name))continue;
  const full=join(folder,item.name);
  const info=lstatSync(full);
  if(!info.isFile()||info.isSymbolicLink()||info.size>MAX_BYTES){
   throw new Error("PAY54_WORKFLOW_SOURCE_UNSAFE");
  }
  const source=readFileSync(full,"utf8");
  const uploads=/(?:\bupload-pages-artifact@|\bgh-pages\b|pages-build-deployment)/i.test(source);
  const deployments=/(?:\bdeploy-pages@|\bpages: write|\bgithub-pages\b)/i.test(source);
  if(uploads||deployments){
   files.push(Object.freeze({
    path:".github/workflows/"+item.name,
    pagesArtifactUploadMentioned:uploads,
    pagesDeploymentMentioned:deployments
   }));
  }
 }
 return Object.freeze({
  schema:"pay54.declared-pages-workflow-inventory.v1",
  scannedYamlFiles:entries.filter(x=>/\.ya?ml$/i.test(x.name)).length,
  candidateWorkflowMentions:Object.freeze(files),
  activeGithubPagesPublicationSource:"NOT_VERIFIED",
  actualPagesSettingsRead:false,
  deployedArtifactInspected:false,
  workflowPublicationAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
