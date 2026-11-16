"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createPay54Batch18ReleaseScorecard}
 from "../governance/pay54-batch18-cto-release-scorecard.mjs";
test("652: actual PAY54 CTO source report identifies blocked public source and no deployment",()=>{
 const r=createPay54Batch18ReleaseScorecard();
 assert.ok(r.siteCandidateCount>30);
 assert.ok(r.blockedFirstPartyReferences>=1);
 assert.ok(r.developmentRuntimeScriptMentions>=1);
 assert.equal(r.releaseSourceStatus,"BLOCKED");
 assert.ok(r.executableInlineScripts>=1);
 assert.equal(r.inlineScriptReviewRequired,true);
 assert.equal(r.activePagesSettings,"NOT_INDEPENDENTLY_VERIFIED");
 assert.equal(r.publicContentReachability,"NOT_INDEPENDENTLY_VERIFIED");
 assert.equal(r.deployed,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("652: clean local source still cannot claim public or financial release",()=>{
 const root=mkdtempSync(join(tmpdir(),"pay54-release-scorecard-"));
 try{
  mkdirSync(join(root,"assets/js"),{recursive:true});
  writeFileSync(join(root,"index.html"),"<html><body>PAY54</body></html>");
  writeFileSync(join(root,"dashboard.html"),'<script src="assets/js/app.js"></script>');
  writeFileSync(join(root,"assets/js/app.js"),"export const readOnly=true;");
  const r=createPay54Batch18ReleaseScorecard(root);
  assert.equal(r.blockedFirstPartyReferences,0);
  assert.equal(r.releaseSourceStatus,"SOURCE_CHECK_PASS");
 assert.equal(r.executableInlineScripts,0);
 assert.equal(r.inlineScriptReviewRequired,false);
  assert.equal(r.releaseApproved,false);
  assert.equal(r.deployed,false);
  assert.equal(r.financialExecutionEnabled,false);
 }finally{rmSync(root,{recursive:true,force:true});}
});
