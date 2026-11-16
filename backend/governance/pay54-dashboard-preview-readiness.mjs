"use strict";

/**
 * PAY54 item 530 — real-source, non-publishing dashboard preview readiness.
 *
 * Builds into a temporary, isolated directory and destroys it immediately.
 * Never uploads the generated files, exposes wallet engines, or contacts API
 * endpoints. Only stable review/error codes are returned.
 */
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {buildPay54DashboardOfflinePreview}
 from "./pay54-dashboard-offline-preview.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const ERROR_CODES=new Set([
 "PAY54_PREVIEW_CSS_DEPENDENCY_UNVERIFIED",
 "PAY54_PREVIEW_HTML_INVALID",
 "PAY54_PREVIEW_EMBEDDED_CONTENT_DENIED",
 "PAY54_PREVIEW_UNSAFE_HTML_ATTRIBUTE",
 "PAY54_PREVIEW_STYLESHEET_NOT_APPROVED",
 "PAY54_PREVIEW_DASHBOARD_NOT_IN_CANDIDATE",
 "PAY54_PREVIEW_SOURCE_UNSAFE",
 "PAY54_PREVIEW_ASSET_COPY_INTEGRITY_FAILED",
 "PAY54_PREVIEW_HTML_WRITE_INTEGRITY_FAILED"
]);
export function assessPay54OfflinePreviewReadiness(sourceRoot=ROOT){
 const target=mkdtempSync(join(tmpdir(),"pay54-safe-visual-readiness-"));
 let result;
 try{
  const candidate=buildPay54DashboardOfflinePreview(resolve(sourceRoot),target);
  result=Object.freeze({
   schema:"pay54.offline-visual-preview-readiness.v1",
   previewCandidateGenerated:true,
   visualAssetCount:candidate.copiedVisualAssets.length,
   refusalCode:null,
   userDataLoaded:false,
   previewHosted:false,
   realMoneyEnabled:false,
   productionRelease:"BLOCKED"
  });
 }catch(error){
  result=Object.freeze({
   schema:"pay54.offline-visual-preview-readiness.v1",
   previewCandidateGenerated:false,
   visualAssetCount:0,
   refusalCode:ERROR_CODES.has(error?.message)?
    error.message:"PAY54_PREVIEW_SOURCE_REVIEW_INCOMPLETE",
   userDataLoaded:false,
   previewHosted:false,
   realMoneyEnabled:false,
   productionRelease:"BLOCKED"
  });
 }finally{
  rmSync(target,{force:true,recursive:true});
 }
 return result;
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const result=assessPay54OfflinePreviewReadiness();
 process.stdout.write(JSON.stringify(result)+"\n");
 if(!result.previewCandidateGenerated)process.exitCode=1;
}
