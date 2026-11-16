"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {assessPay54PagesReleasePreflight}
 from "../governance/pay54-pages-release-preflight.mjs";

function fixture({blocked=false}={}){
 const root=mkdtempSync(join(tmpdir(),"pay54-pages-source-preflight-"));
 mkdirSync(join(root,"assets/js"),{recursive:true});
 const src=blocked?"assets/js/infrastructure/payments/providers/mock.js":"assets/js/app.js";
 writeFileSync(join(root,"index.html"),'<script src="'+src+'"></script>');
 if(blocked)mkdirSync(join(root,"assets/js/infrastructure/payments/providers"),{recursive:true});
 writeFileSync(join(root,src),"export const demo=true;");
 return {root,clean:()=>rmSync(root,{recursive:true,force:true})};
}
test("603: a clean local page candidate passes source checks but not live deployment",()=>{
 const f=fixture();
 try{
  const report=assessPay54PagesReleasePreflight(f.root);
  assert.equal(report.sourceReviewPassed,true);
  assert.deepEqual(report.blockers,[]);
  assert.equal(report.livePagesConfigVerified,false);
  assert.equal(report.releaseAuthorised,false);
  assert.equal(report.productionRelease,"BLOCKED");
 }finally{f.clean();}
});
test("603: development card provider dependency blocks publication before artifact upload",()=>{
 const f=fixture({blocked:true});
 try{
  const report=assessPay54PagesReleasePreflight(f.root);
  assert.equal(report.sourceReviewPassed,false);
  assert.ok(report.blockers.includes("SITE_DEPENDENCY_GRAPH_INCOMPLETE"));
  assert.ok(report.blockers.includes("DEVELOPMENT_PROVIDER_IN_FORBIDDEN_PUBLICATION_PATH"));
  assert.ok(report.unresolvedDependencies.some(x=>
   x.dependency==="assets/js/infrastructure/payments/providers/mock.js"));
  assert.equal(report.settingsChanged,false);
  assert.equal(report.deployed,false);
 }finally{f.clean();}
});
test("603: production release never follows from incomplete or clean source inputs",()=>{
 const a=fixture(),b=fixture({blocked:true});
 try{
  assert.equal(assessPay54PagesReleasePreflight(a.root).productionRelease,"BLOCKED");
  assert.equal(assessPay54PagesReleasePreflight(b.root).productionRelease,"BLOCKED");
 }finally{a.clean();b.clean();}
});
