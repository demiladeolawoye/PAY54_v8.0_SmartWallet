"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,readFileSync,rmSync,mkdirSync}
 from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {recordPay54OfflinePreviewManifest}
 from "../governance/pay54-preview-artifact-manifest.mjs";

const SHA="f".repeat(40);
function fixture(){
 const root=mkdtempSync(join(tmpdir(),"pay54-preview-manifest-"));
 mkdirSync(join(root,"assets/css"),{recursive:true});
 writeFileSync(join(root,"index.html"),"<h1>PAY54 Visual</h1>");
 writeFileSync(join(root,"assets/css/dashboard.css"),"body{color:#102b54}");
 return {root,clean:()=>rmSync(root,{recursive:true,force:true})};
}
test("542: offline manifest anchors SHA-256 of exact visual assets and source commit",()=>{
 const f=fixture();
 try{
  const r=recordPay54OfflinePreviewManifest({previewRoot:f.root,sourceCommitSha:SHA});
  const doc=JSON.parse(readFileSync(join(f.root,"preview-manifest.json"),"utf8"));
  assert.equal(r.fileCount,2);
  assert.equal(doc.sourceCommitSha,SHA);
  assert.equal(doc.files.length,2);
  assert.match(doc.visualTreeSha256,/^[a-f0-9]{64}$/);
  assert.equal(doc.scriptsIncluded,false);
  assert.equal(doc.liveBankingEnabled,false);
  assert.equal(doc.productionRelease,"BLOCKED");
 }finally{f.clean();}
});
test("542: invalid Git source SHA is denied",()=>{
 const f=fixture();
 try{
  assert.throws(()=>recordPay54OfflinePreviewManifest({
   previewRoot:f.root,sourceCommitSha:"untrusted"
  }),/PROVENANCE_REQUIRED/);
 }finally{f.clean();}
});
test("542: internal source files cannot be manifested as a preview",()=>{
 const f=fixture();
 try{
  mkdirSync(join(f.root,"backend"));
  writeFileSync(join(f.root,"backend/secrets.js"),"not a real key");
  assert.throws(()=>recordPay54OfflinePreviewManifest({
   previewRoot:f.root,sourceCommitSha:SHA
  }),/TREE_DENIED/);
 }finally{f.clean();}
});
test("542: manifest cannot be replaced after first creation",()=>{
 const f=fixture();
 try{
  recordPay54OfflinePreviewManifest({previewRoot:f.root,sourceCommitSha:SHA});
  assert.throws(()=>recordPay54OfflinePreviewManifest({
   previewRoot:f.root,sourceCommitSha:SHA
  }),/EEXIST/);
 }finally{f.clean();}
});
