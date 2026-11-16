"use strict";

/**
 * PAY54 541 — offline preview content provenance manifest.
 * The manifest describes exact visual bytes and reviewed source commit.
 * It is not a signature, live Pages attestation or deployment credential.
 */
import {writeFileSync,readFileSync,lstatSync} from "node:fs";
import {resolve,join} from "node:path";
import {createHash} from "node:crypto";
import {inspectPay54PublicationTree}
 from "./pay54-publication-tree-inspector.mjs";

const COMMIT=/^[0-9a-f]{40}$/;
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");

export function recordPay54OfflinePreviewManifest({
 previewRoot,sourceCommitSha
}={}){
 if(typeof previewRoot!=="string"||!previewRoot.trim()||
  !COMMIT.test(sourceCommitSha??"")){
  throw new TypeError("PAY54_PREVIEW_PROVENANCE_REQUIRED");
 }
 const root=resolve(previewRoot);
 const tree=inspectPay54PublicationTree(root);
 if(!tree.sourcePolicyPassed||tree.files.some(file=>
  /(?:^|\/)(?:backend|docs|infrastructure|tests|assets\/js)(?:\/|$)/i.test(file.path))){
  throw new Error("PAY54_PREVIEW_PROVENANCE_TREE_DENIED");
 }
 const file=join(root,"preview-manifest.json");
 const manifest=Object.freeze({
  schema:"pay54.offline-founder-preview-manifest.v1",
  sourceCommitSha,
  visualTreeSha256:tree.manifestSha256,
  files:Object.freeze(tree.files.map(entry=>Object.freeze({
   path:entry.path,bytes:entry.bytes,sha256:entry.sha256
  }))),
  liveBankingEnabled:false,
  scriptsIncluded:false,
  previewHosted:false,
  productionRelease:"BLOCKED"
 });
 const body=Buffer.from(JSON.stringify(manifest,null,2)+"\n","utf8");
 writeFileSync(file,body,{flag:"wx",mode:0o644});
 const copied=readFileSync(file);
 if(sha256(body)!==sha256(copied)){
  throw new Error("PAY54_PREVIEW_MANIFEST_WRITE_FAILED");
 }
 return Object.freeze({
  manifestSha256:sha256(body),
  fileCount:manifest.files.length,
  sourceCommitSha,
  offlineOnly:true,
  productionRelease:"BLOCKED"
 });
}
