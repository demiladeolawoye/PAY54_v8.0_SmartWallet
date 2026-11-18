"use strict";

/**
 * PAY54 implementation 518 — read-only Pages workflow upload-root audit.
 *
 * Rejects workflows containing a Pages artifact upload from the checkout root,
 * a parent directory or a directory outside the explicitly reviewed site
 * staging folder. This is a conservative source inspection, NOT a general
 * YAML parser or an attestation of live GitHub Pages configuration.
 */
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const MAX_SIZE=250_000;
const UPLOAD=/(?:actions\/upload-pages-artifact|\/upload-pages-artifact)@/i;
const DEPLOY=/(?:actions\/deploy-pages|\/deploy-pages)@/i;

export function auditPay54PagesWorkflowSource(yaml){
 if(typeof yaml!=="string"||yaml.length>MAX_SIZE){
  throw new TypeError("PAY54_PAGES_WORKFLOW_SOURCE_REQUIRED");
 }
 const findings=[];
 const usesUpload=UPLOAD.test(yaml);
 const usesDeploy=DEPLOY.test(yaml);
 if(!usesUpload&&usesDeploy)findings.push("DEPLOYMENT_WITHOUT_REVIEWED_UPLOAD");
 if(!usesUpload) findings.push("NO_RESTRICTED_UPLOAD_PROVEN");
 if(/(^|\n)\s*permissions\s*:\s*\n(?:[ \t]+[^\n]*\n)*?[ \t]+contents\s*:\s*write\b/m.test(yaml)){
  findings.push("WRITE_ACCESS_UNEXPECTED");
 }
 const blocks=yaml.split(/\n(?=\s*-\s+(?:name|uses):)/);
 let uploaderCount=0;
 for(const block of blocks){
  if(!UPLOAD.test(block))continue;
  uploaderCount++;
  const match=block.match(/(?:^|\n)\s*path\s*:\s*(?:"([^"\n]*)"|'([^'\n]*)'|([^\s#\n]+))/i);
  const path=(match?.[1]??match?.[2]??match?.[3]??"").trim();
  if(path!=="./site"&&path!=="site"){
   findings.push("UNSAFE_PAGES_UPLOAD_ROOT");
  }
  if(/\b(?:if|with)\s*:\s*\$\{\{/m.test(block)){
   findings.push("DYNAMIC_UPLOAD_CONFIGURATION_REVIEW_REQUIRED");
  }
 }
 if(uploaderCount!==1)findings.push("UPLOAD_STEP_COUNT_INVALID");
 if(!/\bpersist-credentials:\s*false\b/i.test(yaml)){
  findings.push("CREDENTIAL_PERSISTENCE_NOT_DISABLED");
 }
 if(!/\bpermissions:\s*\n/i.test(yaml)){
  findings.push("EXPLICIT_PERMISSIONS_MISSING");
 }
 return Object.freeze({
  schema:"pay54.pages-workflow-source-audit.v1",
  uploadStepCount:uploaderCount,
  usesPagesDeploy:usesDeploy,
  findings:Object.freeze([...new Set(findings)]),
  restrictedUploadPathDeclared:!findings.includes("UNSAFE_PAGES_UPLOAD_ROOT")&&
   uploaderCount===1,
  parsedUsingFullYamlAst:false,
  liveWorkflowIndependentlyVerified:false,
  deploymentApproved:false,
  productionRelease:"BLOCKED"
 });
}
