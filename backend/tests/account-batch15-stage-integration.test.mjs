"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,readdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {stagePay54SiteCandidate} from "../governance/pay54-static-site-stage-builder.mjs";
import {inspectPay54PublicationTree} from "../governance/pay54-publication-tree-inspector.mjs";

function fixture(){
 const root=mkdtempSync(join(tmpdir(),"pay54-stage-boundary-"));
 const source=join(root,"source"),target=join(root,"target");
 mkdirSync(join(source,"assets/js"),{recursive:true});
 mkdirSync(target);
 writeFileSync(join(source,"index.html"),'<script src="assets/js/app.js"></script>');
 writeFileSync(join(source,"assets/js/app.js"),"export const enabled=false;");
 return {root,source,target,clean:()=>rmSync(root,{recursive:true,force:true})};
}
test("472: trusted candidate staging invokes tree inspection without activating deployment",()=>{
 const f=fixture();
 try{
  const report=stagePay54SiteCandidate(f.source,f.target);
  assert.equal(report.candidateCount,2);
  assert.equal(report.productionRelease,"BLOCKED");
  assert.equal(report.actualPagesSettingsModified,false);
  const tree=inspectPay54PublicationTree(join(f.target,"site"));
  assert.equal(tree.sourcePolicyPassed,true);
 }finally{f.clean();}
});
test("472: included source asset resembling credentials is excluded by publication boundary",()=>{
 const f=fixture();
 try{
  writeFileSync(join(f.source,"assets/js/credential.js"),
   "export const fixture=true;");
  assert.throws(()=>stagePay54SiteCandidate(f.source,f.target),
   /PAY54_STAGE_PUBLICATION_BOUNDARY_DENIED/);
  assert.deepEqual(readdirSync(f.target),[]);
 }finally{f.clean();}
});
test("472: source-map files omitted by manifest do not enter staged site",()=>{
 const f=fixture();
 try{
  writeFileSync(join(f.source,"assets/js/app.js.map"),"{}");
  const result=stagePay54SiteCandidate(f.source,f.target);
  assert.equal(result.candidateCount,2);
  assert.deepEqual(readdirSync(join(f.target,"site")).sort(),["assets","index.html"]);
 }finally{f.clean();}
});
