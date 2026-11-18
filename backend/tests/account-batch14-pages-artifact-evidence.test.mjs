"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {hashPay54StaticSiteCandidate}
 from "../governance/pay54-static-site-content-integrity.mjs";
import {assessPay54PagesArtifactInventory}
 from "../governance/pay54-pages-artifact-evidence-review.mjs";

const SHA="e".repeat(40);
function fixture(){
 const root=mkdtempSync(join(tmpdir(),"pay54-artifact-proof-"));
 mkdirSync(join(root,"assets/js"),{recursive:true});
 writeFileSync(join(root,"index.html"),"<title>PAY54</title>");
 writeFileSync(join(root,"assets/js/app.js"),"export const value=1;");
 const artifactEntries=hashPay54StaticSiteCandidate(root).files.map(x=>({...x}));
 return {root,artifactEntries,cleanup:()=>rmSync(root,{recursive:true,force:true})};
}
const assess=(f,entries)=>assessPay54PagesArtifactInventory({
 sourceRoot:f.root,artifactEntries:entries??f.artifactEntries,
 artifactCommitSha:SHA,expectedCommitSha:SHA
});
test("448: matching supplied artifacts never mean confirmed deployed site",()=>{
 const f=fixture();
 try{
  const result=assess(f);
  assert.equal(result.manifestsMatch,true);
  assert.equal(result.artifactOriginIndependentlyVerified,false);
  assert.equal(result.actualPagesDeploymentInspected,false);
  assert.equal(result.releaseAuthorised,false);
  assert.equal(result.productionRelease,"BLOCKED");
 }finally{f.cleanup();}
});
test("448: extra backend source and missing page fail closed",()=>{
 const f=fixture();
 try{
  const entries=f.artifactEntries.filter(x=>x.path!=="index.html");
  entries.push({path:"backend/internal.mjs",bytes:10,sha256:"a".repeat(64)});
  const result=assess(f,entries);
  assert.deepEqual(result.issues.map(x=>x.category),
   ["UNEXPECTED_ARTIFACT_PATH","MISSING_ARTIFACT_PATH"]);
 }finally{f.cleanup();}
});
test("448: tampered artifact digest and duplicate path fail closed",()=>{
 const f=fixture();
 try{
  const entries=f.artifactEntries.map(x=>({...x}));
  entries[0].sha256="f".repeat(64);
  entries.push({...entries[0]});
  const result=assess(f,entries);
  assert.equal(result.manifestsMatch,false);
  assert.ok(result.issues.some(x=>x.category==="ARTIFACT_CONTENT_MISMATCH"));
  assert.ok(result.issues.some(x=>x.category==="DUPLICATE_ARTIFACT_PATH"));
 }finally{f.cleanup();}
});
test("448: source commit mismatch and traversing artifact are denied",()=>{
 const f=fixture();
 try{
  assert.throws(()=>assessPay54PagesArtifactInventory({
   sourceRoot:f.root,artifactEntries:f.artifactEntries,
   artifactCommitSha:"0".repeat(40),expectedCommitSha:SHA
  }),/PROVENANCE_INVALID/);
  const result=assess(f,[{path:"../backend/password.env",bytes:1,sha256:"a".repeat(64)}]);
  assert.ok(result.issues.some(x=>x.category==="INVALID_ENTRY"));
  assert.equal(result.manifestsMatch,false);
 }finally{f.cleanup();}
});
