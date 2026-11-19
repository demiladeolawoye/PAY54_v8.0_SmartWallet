"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,
 readdirSync,rmSync,existsSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {stagePay54StaticSiteReview}
 from "../governance/pay54-static-site-review-stage.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
function temp(fn){
 const root=mkdtempSync(join(tmpdir(),"pay54-review-stage-test-"));
 try{return fn(root);}finally{rmSync(root,{recursive:true,force:true});}
}
function put(root,path,body){
 const parts=path.split("/");
 mkdirSync(join(root,...parts.slice(0,-1)),{recursive:true});
 writeFileSync(join(root,...parts),body);
}
test("373: real PAY54 snapshot must fail closed with an excluded linked-card infrastructure reference",()=>{
 temp(reviewParent=>{
  assert.throws(()=>stagePay54StaticSiteReview({
   sourceRoot:ROOT,reviewParent
  }),/PAY54_STATIC_REVIEW_DEPENDENCIES_BLOCKED/);
  assert.deepEqual(readdirSync(reviewParent),[]);
 });
});
test("373: clean synthetic frontend snapshot excludes internal paths and verifies copied bytes",()=>{
 temp(root=>{
  const source=join(root,"source"),reviewParent=join(root,"review");
  mkdirSync(source);mkdirSync(reviewParent);
  put(source,"index.html",
   '<!doctype html><link rel="stylesheet" href="assets/css/app.css"><script src="assets/js/app.js"></script>');
  put(source,"assets/css/app.css","body{font-family:system-ui}");
  put(source,"assets/js/app.js","export const test=true;");
  put(source,"assets/js/dashboard.backup.js","not for publication");
  put(source,"backend/secret.js","not for publication");
  put(source,"docs/internal.md","not for publication");
  const staged=stagePay54StaticSiteReview({sourceRoot:source,reviewParent});
  assert.equal(staged.fileCount,3);
  assert.equal(staged.hashes.length,3);
  assert.equal(staged.livePagesArtifactReplaced,false);
  assert.equal(staged.githubPagesSettingsChanged,false);
  assert.equal(staged.productionRelease,"BLOCKED");
  assert.ok(staged.excludedSourcePaths.includes("assets/js/dashboard.backup.js"));
  for(const {path,sha256,bytes} of staged.hashes){
   assert.equal(path.startsWith("backend/"),false);
   assert.equal(path.startsWith("docs/"),false);
   assert.equal(path.includes("backup"),false);
   const contents=readFileSync(join(staged.reviewDirectory,...path.split("/")));
   assert.equal(contents.length,bytes);
   assert.equal(createHash("sha256").update(contents).digest("hex"),sha256);
  }
  assert.equal(existsSync(join(staged.reviewDirectory,"backend")),false);
  assert.equal(existsSync(join(staged.reviewDirectory,"docs")),false);
 });
});

test("373: missing dependencies refuse to create a staged package",()=>{
 temp(root=>{
  const source=join(root,"source"),parent=join(root,"review");
  mkdirSync(source);mkdirSync(parent);
  put(source,"index.html",'<script src="assets/js/missing.js"></script>');
  assert.throws(()=>stagePay54StaticSiteReview({
   sourceRoot:source,reviewParent:parent
  }),/PAY54_STATIC_REVIEW_DEPENDENCIES_BLOCKED/);
  assert.deepEqual(readdirSync(parent),[]);
 });
});
test("373: source and review destination cannot overlap",()=>{
 temp(root=>{
  put(root,"index.html","<html>PAY54</html>");
  assert.throws(()=>stagePay54StaticSiteReview({
   sourceRoot:root,reviewParent:root
  }),/PAY54_STATIC_REVIEW_DIRECTORY_OVERLAP/);
  const nested=join(root,"nested");
  mkdirSync(nested);
  assert.throws(()=>stagePay54StaticSiteReview({
   sourceRoot:root,reviewParent:nested
  }),/PAY54_STATIC_REVIEW_DIRECTORY_OVERLAP/);
 });
});
