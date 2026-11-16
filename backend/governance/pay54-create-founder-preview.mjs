"use strict";

/**
 * PAY54 item 533 — package the founder's offline visual preview for download.
 * Offline, test-only: no hosted preview, no external connections, no wallet
 * engines. The caller provides an EMPTY directory outside the source tree.
 */
import {readFileSync} from "node:fs";
import {resolve,join} from "node:path";
import {fileURLToPath} from "node:url";
import {buildPay54DashboardOfflinePreview}
 from "./pay54-dashboard-offline-preview.mjs";
import {inspectPay54PublicationTree}
 from "./pay54-publication-tree-inspector.mjs";
import {recordPay54OfflinePreviewManifest}
 from "./pay54-preview-artifact-manifest.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
export function createPay54FounderPreviewBundle(sourceRoot,emptyTarget,sourceCommitSha){
 if(!/^[a-f0-9]{40}$/.test(sourceCommitSha??"")){
  throw new Error("PAY54_FOUNDER_PREVIEW_SOURCE_SHA_REQUIRED");
 }
 const result=buildPay54DashboardOfflinePreview(sourceRoot,emptyTarget);
 const tree=inspectPay54PublicationTree(result.outputDirectory);
 if(!tree.sourcePolicyPassed){
  throw new Error("PAY54_FOUNDER_PREVIEW_TREE_DENIED");
 }
 const index=readFileSync(join(result.outputDirectory,"index.html"),"utf8");
 if(!index.includes("PAY54 OFFLINE VISUAL PREVIEW")||
  !index.includes("script-src 'none'")||
  !index.includes("connect-src 'none'")||
  /<script\b/i.test(index)||
  result.copiedVisualAssets.some(path=>/\.(?:m?js|html)$/i.test(path))){
  throw new Error("PAY54_FOUNDER_PREVIEW_RUNTIME_DENIED");
 }
 const provenance=recordPay54OfflinePreviewManifest({
  previewRoot:result.outputDirectory,sourceCommitSha
 });
 return Object.freeze({
  schema:"pay54.offline-founder-artifact.v1",
  sourceCommitSha,
  contentManifestSha256:provenance.manifestSha256,
  copiedVisualAssets:result.copiedVisualAssets.length,
  staticFileCount:tree.fileCount,
  fileManifestSha256:tree.manifestSha256,
  previewDirectory:result.outputDirectory,
  hosted:false,
  userDataUsed:false,
  sourceScriptsBundled:false,
  financialTransactionsEnabled:false,
  productionRelease:"BLOCKED"
 });
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const target=process.argv[2];
  if(typeof target!=="string"||!target.trim()){
   throw new Error("PAY54_FOUNDER_PREVIEW_TARGET_REQUIRED");
  }
  const result=createPay54FounderPreviewBundle(
   ROOT,resolve(target),process.env.PAY54_PREVIEW_SOURCE_SHA
  );
  process.stdout.write(JSON.stringify({
   schema:result.schema,sourceCommitSha:result.sourceCommitSha,
   contentManifestSha256:result.contentManifestSha256,
   staticFileCount:result.staticFileCount,
   fileManifestSha256:result.fileManifestSha256,
   hosted:false,financialTransactionsEnabled:false,
   productionRelease:"BLOCKED"
  })+"\n");
 }catch{
  process.stderr.write("PAY54_FOUNDER_PREVIEW_ARTIFACT_REJECTED\n");
  process.exitCode=1;
 }
}
