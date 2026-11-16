"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {assessPay54Batch18ReleaseMatrix}
 from "../governance/pay54-batch18-release-matrix.mjs";

function cleanFixture(){
 const root=mkdtempSync(join(tmpdir(),"pay54-release-matrix-test-"));
 mkdirSync(join(root,"assets/js"),{recursive:true});
 writeFileSync(join(root,"index.html"),'<script src="assets/js/app.js"></script>');
 writeFileSync(join(root,"dashboard.html"),"<html><body>Safe test</body></html>");
 writeFileSync(join(root,"assets/js/app.js"),"export const enabled=false;");
 return {root,clean:()=>rmSync(root,{recursive:true,force:true})};
}
test("628: even clean source cannot erase operational Pages and rollback blockers",()=>{
 const f=cleanFixture();
 try{
  const r=assessPay54Batch18ReleaseMatrix({sourceRoot:f.root});
  assert.equal(r.categories.restrictedSource,"SOURCE_CHECK_PASS");
  assert.equal(r.categories.staticReferences,"SOURCE_CHECK_PASS");
  assert.equal(r.categories.independentLiveReview,"NOT_VERIFIED");
  assert.equal(r.releaseApproved,false);
  assert.equal(r.financialExecutionEnabled,false);
  assert.equal(r.productionRelease,"BLOCKED");
  assert.ok(r.blockingReasons.includes("ACTIVE_PAGES_CONFIGURATION_NOT_VERIFIED_BY_SECURITY"));
 }finally{f.clean();}
});
test("628: exact PAY54 site remains blocked by its development provider source reference",()=>{
 const r=assessPay54Batch18ReleaseMatrix();
 assert.equal(r.categories.restrictedSource,"BLOCKED");
 assert.equal(r.categories.staticReferences,"BLOCKED");
 assert.ok(r.blockingReasons.includes("HTML_DEPENDENCIES_NOT_PUBLICATION_SAFE"));
 assert.ok(r.blockingReasons.includes("LINKED_CARD_RELEASE_CHOICE_INCOMPLETE"));
 assert.equal(r.currentPagesChanged,false);
 assert.equal(r.releaseApproved,false);
});
