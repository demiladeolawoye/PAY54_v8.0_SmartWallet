"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
 mkdtempSync,mkdirSync,writeFileSync,symlinkSync,rmSync
} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {inspectPay54StaticSiteCandidate}
 from "../governance/pay54-static-site-candidate-inventory.mjs";

function temporary(fn){
 const root=mkdtempSync(join(tmpdir(),"pay54-static-candidate-"));
 try{return fn(root);}finally{rmSync(root,{recursive:true,force:true});}
}
test("365: real repo inventory excludes backend, workflows and backup JavaScript",()=>{
 const result=inspectPay54StaticSiteCandidate();
 assert.ok(result.candidateCount>=10);
 assert.ok(result.candidatePaths.includes("dashboard.html"));
 assert.ok(result.candidatePaths.includes("index.html"));
 assert.ok(result.candidatePaths.includes("assets/js/dashboard-blueprint-shell.js"));
 assert.ok(result.excludedSourcePaths.includes("assets/js/dashboard.backup.js"));
 assert.ok(result.candidatePaths.every(path=>
  !path.startsWith("backend/")&&!path.startsWith(".github/")&&
  !path.startsWith("docs/")&&!path.startsWith("infrastructure/")&&
  !/backup|lastworking|\.map$/i.test(path)
 ));
 assert.equal(result.actualPagesArtifactInspected,false);
 assert.equal(result.repoPagesSettingsVerified,false);
 assert.equal(result.fullAssetDependencyGraphVerified,false);
 assert.equal(result.publicationAuthorized,false);
 assert.equal(result.productionRelease,"BLOCKED");
 assert.ok(Object.isFrozen(result.candidatePaths));
});
test("365: a temporary candidate excludes undeployable files and never copies them",()=>{
 temporary(root=>{
  mkdirSync(join(root,"assets","js"),{recursive:true});
  mkdirSync(join(root,"backend"),{recursive:true});
  writeFileSync(join(root,"index.html"),"PAY54");
  writeFileSync(join(root,"assets/js/app.js"),"safe");
  writeFileSync(join(root,"assets/js/app.backup.js"),"legacy");
  writeFileSync(join(root,"assets/js/app.js.map"),"sourceMap");
  writeFileSync(join(root,"backend/internal.mjs"),"private source");
  const result=inspectPay54StaticSiteCandidate(root);
  assert.deepEqual(result.candidatePaths,["assets/js/app.js","index.html"]);
  assert.deepEqual(result.excludedSourcePaths,
   ["assets/js/app.backup.js","assets/js/app.js.map"]);
  assert.equal(result.productionRelease,"BLOCKED");
 });
});
test("365: symlinks in source tree are rejected before any release",()=>{
 temporary(root=>{
  mkdirSync(join(root,"assets","js"),{recursive:true});
  writeFileSync(join(root,"index.html"),"PAY54");
  writeFileSync(join(root,"internal.mjs"),"private");
  symlinkSync(join(root,"internal.mjs"),join(root,"assets/js/linked.js"));
  assert.throws(()=>inspectPay54StaticSiteCandidate(root),
   /PAY54_SITE_CANDIDATE_SYMLINK_DENIED/);
 });
 temporary(root=>{
  writeFileSync(join(root,"index.html"),"PAY54");
  mkdirSync(join(root,"internal"),{recursive:true});
  symlinkSync(join(root,"internal"),join(root,"assets"));
  assert.throws(()=>inspectPay54StaticSiteCandidate(root),
   /PAY54_SITE_CANDIDATE_ASSETS_ROOT_INVALID/);
 });
});
test("365: oversized and malformed candidate inventories fail closed",()=>{
 temporary(root=>{
  writeFileSync(join(root,"index.html"),"x".repeat(3_000_001));
  assert.throws(()=>inspectPay54StaticSiteCandidate(root),
   /PAY54_SITE_CANDIDATE_PAGE_INVALID/);
 });
 temporary(root=>{
  mkdirSync(join(root,"backend"),{recursive:true});
  writeFileSync(join(root,"backend/internal.mjs"),"hidden");
  assert.throws(()=>inspectPay54StaticSiteCandidate(root),
   /PAY54_SITE_CANDIDATE_EMPTY_OR_OVERSIZED/);
 });
});
