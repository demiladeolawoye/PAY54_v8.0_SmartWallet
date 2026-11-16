"use strict";

/**
 * PAY54 Batch18 item 635 — local downloaded Pages archive-to-site comparison.
 * Requires two caller-supplied local paths: independently reviewed restricted
 * site directory and the exact downloaded artifact.tar. No network, no upload.
 */
import {readFileSync,lstatSync} from "node:fs";
import {resolve,relative,isAbsolute} from "node:path";
import {fileURLToPath} from "node:url";
import {inspectPay54PublicationTree}
 from "./pay54-publication-tree-inspector.mjs";
import {verifyPay54PagesTarAgainstSource}
 from "./pay54-batch18-pages-tar-attestation.mjs";

function overlap(a,b){
 const rel=relative(a,b);
 return !rel||(!rel.startsWith("..")&&!isAbsolute(rel));
}
export function attestPay54DownloadedPagesTar({
 restrictedSiteRoot,downloadedTarPath
}={}){
 if(typeof restrictedSiteRoot!=="string"||!restrictedSiteRoot.trim()||
  typeof downloadedTarPath!=="string"||!downloadedTarPath.trim()){
  throw new TypeError("PAY54_DOWNLOADED_TAR_PATHS_REQUIRED");
 }
 const site=resolve(restrictedSiteRoot),tar=resolve(downloadedTarPath);
 if(overlap(site,tar))throw new Error("PAY54_DOWNLOADED_TAR_OVERLAP");
 const info=lstatSync(tar);
 if(!info.isFile()||info.isSymbolicLink()||info.size>64*1024*1024){
  throw new Error("PAY54_DOWNLOADED_TAR_NOT_PLAIN_FILE");
 }
 const source=inspectPay54PublicationTree(site);
 if(!source.sourcePolicyPassed){
  throw new Error("PAY54_DOWNLOADED_TAR_SOURCE_TREE_DENIED");
 }
 const result=verifyPay54PagesTarAgainstSource(readFileSync(tar),source);
 return Object.freeze({
  schema:"pay54.downloaded-pages-tar-compare.v1",
  restrictedSourceManifestSha256:source.manifestSha256,
  expectedFiles:result.expectedFiles,
  archiveFiles:result.actualFiles,
  digestAndPathsMatched:result.exactSourceBytesMatched,
  findings:result.mismatches,
  missingFiles:result.missingFileCount,
  remoteGithubIdentityVerified:false,
  activeProductionArtifactVerified:false,
  livePublicPathReachabilityVerified:false,
  gitHubPagesSettingsModified:false,
  deploymentApproved:false,
  productionRelease:"BLOCKED"
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const r=attestPay54DownloadedPagesTar({
   restrictedSiteRoot:process.argv[2],
   downloadedTarPath:process.argv[3]
  });
  process.stdout.write(JSON.stringify(r,null,2)+"\n");
  if(!r.digestAndPathsMatched)process.exitCode=2;
 }catch{
  process.stderr.write("PAY54_DOWNLOADED_PAGES_ARTIFACT_NOT_ATTESTED\n");
  process.exitCode=2;
 }
}
