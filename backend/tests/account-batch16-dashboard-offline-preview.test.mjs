"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {buildPay54DashboardOfflinePreview}
 from "../governance/pay54-dashboard-offline-preview.mjs";

function fixture(html){
 const root=mkdtempSync(join(tmpdir(),"pay54-visual-snapshot-"));
 const source=join(root,"source"),output=join(root,"out");
 mkdirSync(join(source,"assets/css"),{recursive:true});
 mkdirSync(join(source,"assets/js"),{recursive:true});
 mkdirSync(join(source,"assets/img"),{recursive:true});
 mkdirSync(output);
 writeFileSync(join(source,"dashboard.html"),html??[
  '<!doctype html><html><head>',
  '<link rel="stylesheet" href="assets/css/dashboard.css?build=test">',
  '<script src="assets/js/dashboard-core.js"></script>',
  '</head><body><div id="profileName">Synthetic Account</div>',
  '<button id="transfer">Transfer</button>',
  '<a href="https://example.com">Link</a><p>Wallet summary</p>',
  '</body></html>'
 ].join(""));
 writeFileSync(join(source,"assets/css/dashboard.css"),"body{color:navy}");
 writeFileSync(join(source,"assets/js/dashboard-core.js"),"throw new Error('THIS MUST NOT RUN');");
 writeFileSync(join(source,"assets/img/logo.svg"),'<svg xmlns="http://www.w3.org/2000/svg"/>');
 return {root,source,output,clean:()=>rmSync(root,{recursive:true,force:true})};
}
test("526: preview retains real dashboard structure but never copies/executes engines",()=>{
 const f=fixture();
 try{
  const r=buildPay54DashboardOfflinePreview(f.source,f.output);
  const html=readFileSync(join(f.output,"preview/index.html"),"utf8");
  assert.equal(r.scriptsCopied,false);
  assert.equal(r.realMoneyEnabled,false);
  assert.equal(r.networkConnectionsAllowed,false);
  assert.equal(r.productionRelease,"BLOCKED");
  assert.match(html,/Wallet summary/);
  assert.match(html,/OFFLINE VISUAL PREVIEW/);
  assert.match(html,/script-src 'none'/);
  assert.match(html,/connect-src 'none'/);
  assert.match(html,/<button disabled/);
  assert.match(html,/Preview User/);
  assert.doesNotMatch(html,/<script\b/i);
  assert.doesNotMatch(html,/https:\/\/example.com/);
  assert.equal(readdirSync(join(f.output,"preview/assets")).includes("js"),false);
  assert.equal((html.match(/dashboard\.css\?build=test/g)??[]).length,1);
 }finally{f.clean();}
});
test("526: output must be empty and outside repository source",()=>{
 const f=fixture();
 try{
  assert.throws(()=>buildPay54DashboardOfflinePreview(f.source,f.source),
   /OVERLAPPING_ROOTS/);
  writeFileSync(join(f.output,"other.txt"),"existing");
  assert.throws(()=>buildPay54DashboardOfflinePreview(f.source,f.output),
   /EMPTY_TARGET_REQUIRED/);
 }finally{f.clean();}
});
test("526: event handler attributes and embedded frames cause failure before output",()=>{
 for(const html of [
  '<html><head></head><body onclick="send()">Hello</body></html>',
  '<html><head></head><body><iframe src="https://example.org"></iframe></body></html>'
 ]){
  const f=fixture(html);
  try{
   assert.throws(()=>buildPay54DashboardOfflinePreview(f.source,f.output),
    /UNSAFE_HTML_ATTRIBUTE|EMBEDDED_CONTENT_DENIED/);
   assert.deepEqual(readdirSync(f.output),[]);
  }finally{f.clean();}
 }
});
test("526: unapproved external stylesheet is rejected",()=>{
 const f=fixture('<html><head><link rel="stylesheet" href="https://example.org/style.css"></head><body>Hi</body></html>');
 try{
  assert.throws(()=>buildPay54DashboardOfflinePreview(f.source,f.output),
   /STYLESHEET_NOT_APPROVED/);
 }finally{f.clean();}
});

test("529: visual CSS and image assets preserve exact source bytes",()=>{
 const f=fixture();
 try{
  const report=buildPay54DashboardOfflinePreview(f.source,f.output);
  assert.ok(report.copiedVisualAssets.includes("assets/css/dashboard.css"));
  assert.ok(report.copiedVisualAssets.includes("assets/img/logo.svg"));
  for(const file of report.copiedVisualAssets){
   const source=readFileSync(join(f.source,file));
   const preview=readFileSync(join(f.output,"preview",file));
   assert.deepEqual(preview,source);
  }
  assert.equal(report.copiedVisualAssets.some(x=>x.endsWith(".js")),false);
 }finally{f.clean();}
});
test("529: untrusted remote CSS dependencies cannot enter a local visual preview",()=>{
 const f=fixture();
 try{
  writeFileSync(join(f.source,"assets/css/dashboard.css"),
   '@import url("https://cdn.example.invalid/preview.css");');
  assert.throws(()=>buildPay54DashboardOfflinePreview(f.source,f.output),
   /CSS_DEPENDENCY_UNVERIFIED/);
  assert.deepEqual(readdirSync(f.output),[]);
 }finally{f.clean();}
});

test("537: SVG carrying executable markup or external references fails before packaging",()=>{
 for(const malicious of [
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject>unsafe</foreignObject></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.org/a.png"/></svg>'
 ]){
  const f=fixture();
  try{
   writeFileSync(join(f.source,"assets/img/logo.svg"),malicious);
   assert.throws(()=>buildPay54DashboardOfflinePreview(f.source,f.output),
    /SVG_ACTIVE_CONTENT_DENIED/);
   assert.deepEqual(readdirSync(f.output),[]);
  }finally{f.clean();}
 }
});
