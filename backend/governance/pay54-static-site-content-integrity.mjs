"use strict";

/**
 * PAY54 implementation 381 — read-only candidate content integrity catalogue.
 * SHA-256 hashes are computed from the selected public source bytes. The result
 * proves local source integrity only; it does not attest uploaded Pages artifacts.
 */
import {createHash} from "node:crypto";
import {readFileSync,lstatSync} from "node:fs";
import {join,resolve,relative,isAbsolute} from "node:path";
import {fileURLToPath} from "node:url";
import {inspectPay54StaticSiteCandidate} from "./pay54-static-site-candidate-inventory.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const MAX_BYTES=3_000_000;
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");

export function hashPay54StaticSiteCandidate(sourceRoot=ROOT){
 const root=resolve(sourceRoot);
 const inventory=inspectPay54StaticSiteCandidate(root);
 const files=[];
 for(const path of inventory.candidatePaths){
  const full=resolve(root,path);
  const inside=relative(root,full);
  if(!inside||inside.startsWith("..")||isAbsolute(inside)){
   throw new Error("PAY54_CANDIDATE_OUTSIDE_ROOT");
  }
  const info=lstatSync(full);
  if(!info.isFile()||info.isSymbolicLink()||info.size>MAX_BYTES){
   throw new Error("PAY54_CANDIDATE_INTEGRITY_FILE_DENIED");
  }
  const data=readFileSync(full);
  if(data.byteLength>MAX_BYTES||data.byteLength!==info.size){
   throw new Error("PAY54_CANDIDATE_INTEGRITY_RACE");
  }
  files.push(Object.freeze({path,bytes:data.byteLength,sha256:digest(data)}));
 }
 const payload=files.map(x=>[x.path,x.bytes,x.sha256].join("\0")).join("\n");
 return Object.freeze({
  schema:"pay54.site-candidate-content-attestation.v1",
  candidateCount:files.length,
  manifestSha256:digest(Buffer.from(payload,"utf8")),
  files:Object.freeze(files),
  realPagesArtifactInspected:false,
  publicSiteVerified:false,
  productionRelease:"BLOCKED"
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const report=hashPay54StaticSiteCandidate();
  process.stdout.write(JSON.stringify(report,null,2)+"\n");
 }catch{
  process.stderr.write("PAY54_SITE_CANDIDATE_HASH_FAILED\n");
  process.exitCode=1;
 }
}
