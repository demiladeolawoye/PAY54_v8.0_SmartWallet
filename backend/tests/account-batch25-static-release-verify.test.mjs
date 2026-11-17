"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,symlinkSync,linkSync,rmSync}
 from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import { verifyPay54StaticReleaseDirectory as verify }
 from "../governance/pay54-batch25-static-release-verify.mjs";

function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),"pay54-pages-review-"));
 t.after(()=>rmSync(dir,{force:true,recursive:true}));
 mkdirSync(join(dir,"assets"));mkdirSync(join(dir,"assets","css"));
 writeFileSync(join(dir,"index.html"),"<!doctype html><html><body>PAY54</body></html>");
 writeFileSync(join(dir,"assets","css","site.css"),":root{color-scheme:light}");
 return dir;
}
test("971: isolated static candidate produces immutable SHA256 manifest, never deploy approval",t=>{
 const dir=fixture(t),result=verify({directory:dir});
 assert.equal(result.fileCount,2);
 assert.ok(result.entries[0].sha256.length===64);
 assert.equal(result.candidateDirectoryApprovedForIndependentReview,true);
 assert.equal(result.remoteArtifactInspected,false);
 assert.equal(result.deploymentAuthorised,false);
 assert.ok(Object.isFrozen(result.entries));
});
test("971: backend, SQL, private docs, sourcemaps and dotfiles are rejected",t=>{
 const dir=fixture(t);
 for(const unsafe of [
  ["backend/src/server.mjs","bad"],
  [".env.production","PASSWORD=secret"],
  ["assets/js/app.js.map","sourceMappingURL"],
  ["docs/internal.md","not public"],
  ["database.sql","SELECT private"]
 ]){
  const path=join(dir,...unsafe[0].split("/"));
  const directory=path.slice(0,path.lastIndexOf("/"));
  mkdirSync(directory,{recursive:true});
  writeFileSync(path,unsafe[1]);
  assert.throws(()=>verify({directory:dir}),/STATIC_RELEASE_BUNDLE_DENIED/);
  rmSync(path);
 }
});
test("971: filesystem symlinks and hardlink source aliases cannot be published",t=>{
 const dir=fixture(t);
 symlinkSync(join(dir,"index.html"),join(dir,"alias.html"));
 assert.throws(()=>verify({directory:dir}),/STATIC_RELEASE_BUNDLE_DENIED/);
 rmSync(join(dir,"alias.html"));
 linkSync(join(dir,"index.html"),join(dir,"duplicate.html"));
 assert.throws(()=>verify({directory:dir}),/STATIC_RELEASE_BUNDLE_DENIED/);
});
test("971: missing entry and unreadable root fail closed",t=>{
 const dir=fixture(t);
 rmSync(join(dir,"index.html"));
 assert.throws(()=>verify({directory:dir}),/STATIC_RELEASE_BUNDLE_DENIED/);
 assert.throws(()=>verify({directory:"/pay54-nonexistent-review-dir"}),
  /STATIC_RELEASE_BUNDLE_DENIED/);
});
