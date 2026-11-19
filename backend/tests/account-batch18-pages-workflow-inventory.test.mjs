"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {inspectPay54DeclaredPagesWorkflows}
 from "../governance/pay54-batch18-pages-workflow-inventory.mjs";
function fixture(){
 const root=mkdtempSync(join(tmpdir(),"pay54-pages-declarations-"));
 mkdirSync(join(root,".github/workflows"),{recursive:true});
 return {root,add:(name,s)=>writeFileSync(join(root,".github/workflows",name),s),
  clean:()=>rmSync(root,{recursive:true,force:true})};
}
test("632: workflow inventory reports code mentions but never claims active deployer",()=>{
 const f=fixture();
 try{
  f.add("pages.yml","name: Pages\nsteps:\n - uses: actions/upload-pages-artifact@0123456789\n - uses: actions/deploy-pages@0123456789");
  f.add("tests.yaml","name: CI\npermissions:\n  contents: read");
  const r=inspectPay54DeclaredPagesWorkflows(f.root);
  assert.equal(r.scannedYamlFiles,2);
  assert.equal(r.candidateWorkflowMentions.length,1);
  assert.equal(r.candidateWorkflowMentions[0].pagesArtifactUploadMentioned,true);
  assert.equal(r.candidateWorkflowMentions[0].pagesDeploymentMentioned,true);
  assert.equal(r.actualPagesSettingsRead,false);
  assert.equal(r.activeGithubPagesPublicationSource,"NOT_VERIFIED");
  assert.equal(r.productionRelease,"BLOCKED");
 }finally{f.clean();}
});
test("632: absent source workflows must not mean no active GitHub Pages exposure",()=>{
 const f=fixture();
 try{
  const r=inspectPay54DeclaredPagesWorkflows(f.root);
  assert.deepEqual(r.candidateWorkflowMentions,[]);
  assert.equal(r.activeGithubPagesPublicationSource,"NOT_VERIFIED");
  assert.equal(r.deployedArtifactInspected,false);
 }finally{f.clean();}
});
test("632: a YAML symlink cannot be followed by source inventory",()=>{
 const f=fixture();
 try{
  f.add("pages.yml","name: Test");
  assert.equal(inspectPay54DeclaredPagesWorkflows(f.root).scannedYamlFiles,1);
 }finally{f.clean();}
});
