"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {verifyPay54StaticSiteDependencies}
 from "../governance/pay54-static-site-dependency-review.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
function temporary(fn){
 const root=mkdtempSync(join(tmpdir(),"pay54-dependency-review-"));
 try{return fn(root);}finally{rmSync(root,{recursive:true,force:true});}
}
function write(root,path,content){
 const parts=path.split("/");
 mkdirSync(join(root,...parts.slice(0,-1)),{recursive:true});
 writeFileSync(join(root,...parts),content);
}
test("369: PAY54 real repository candidate must retain HTML CSS and JS static dependencies",()=>{
 const result=verifyPay54StaticSiteDependencies(ROOT);
 assert.ok(result.includedSourceFiles>30);
 assert.ok(result.localReferences>20);
 assert.equal(result.dependencyCheckPassed,true,JSON.stringify(result.issues.slice(0,20)));
 assert.deepEqual(result.issues,[]);
 assert.equal(result.remoteScriptsIntegrityVerified,false);
 assert.equal(result.publicArtifactInspected,false);
 assert.equal(result.livePublicationAuthorised,false);
 assert.equal(result.release,"BLOCKED");
});
test("369: missing script and blocked backend relative path are not promoted",()=>{
 temporary(root=>{
  write(root,"index.html",'<script src="assets/js/missing.js"></script>');
  const r=verifyPay54StaticSiteDependencies(root);
  assert.equal(r.dependencyCheckPassed,false);
  assert.equal(r.issues[0].reason,"MISSING_CANDIDATE_DEPENDENCY");
 });
 temporary(root=>{
  write(root,"index.html",'<script src="backend/service.mjs"></script>');
  write(root,"backend/service.mjs","secret");
  const r=verifyPay54StaticSiteDependencies(root);
  assert.equal(r.dependencyCheckPassed,false);
  assert.equal(r.issues[0].reason,"MISSING_CANDIDATE_DEPENDENCY");
 });
});
test("369: safe CSS parent-relative images remain in the vetted site",()=>{
 temporary(root=>{
  write(root,"index.html",'<link href="assets/css/app.css" rel="stylesheet">');
  write(root,"assets/css/app.css",'body{background:url("../img/logo.svg")}');
  write(root,"assets/img/logo.svg","<svg></svg>");
  const r=verifyPay54StaticSiteDependencies(root);
  assert.equal(r.dependencyCheckPassed,true,JSON.stringify(r.issues));
  assert.equal(r.localReferences,2);
 });
});
test("369: traversal, unknown remote scripts and encoded paths are refused",()=>{
 for(const bad of [
  "../../etc/passwd","%2e%2e/%2e%2e/backend/secret.js",
  "https://untrusted.example/steal.js","//example.org/unsafe.js",
  "/private/script.js","assets%2fjs/app.js","javascript:alert(1)"
 ]){
  temporary(root=>{
   write(root,"index.html",'<script src="'+bad+'"></script>');
   const r=verifyPay54StaticSiteDependencies(root);
   assert.equal(r.dependencyCheckPassed,false,bad);
   assert.equal(r.issues.length,1,bad);
  });
 }
});
test("369: known legacy QR libraries are counted, not silently trusted for integrity",()=>{
 temporary(root=>{
  write(root,"index.html",
   '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>');
  const r=verifyPay54StaticSiteDependencies(root);
  assert.equal(r.dependencyCheckPassed,true);
  assert.equal(r.reviewedRemoteReferences,1);
  assert.equal(r.remoteScriptsIntegrityVerified,false);
  assert.equal(r.release,"BLOCKED");
 });
});
