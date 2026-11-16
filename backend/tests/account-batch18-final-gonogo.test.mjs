"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {inspectPay54FinalGoNoGo}
 from "../governance/pay54-batch18-final-gonogo.mjs";
test("656: real PAY54 release is NO-GO while provider and Pages risk remain open",()=>{
 const r=inspectPay54FinalGoNoGo();
 assert.equal(r.releaseDecision,"NO_GO");
 assert.equal(r.productionRelease,"BLOCKED");
 assert.equal(r.sourceDependencySafe,false);
 assert.ok(r.findings.includes("PUBLICATION_DEPENDENCY_GRAPH_BLOCKED"));
 assert.ok(r.findings.includes("DEVELOPMENT_RUNTIME_REQUIRES_REVIEW"));
 assert.ok(r.findings.includes("HISTORIC_PAGES_P0_SECURITY_ASSESSMENT_REQUIRED"));
 assert.equal(r.pagesSettingsModified,false);
 assert.equal(r.customerMoneyEnabled,false);
});
test("656: a clean synthetic source cannot replace independent live site authority",()=>{
 const root=mkdtempSync(join(tmpdir(),"pay54-final-gonogo-"));
 try{
  mkdirSync(join(root,"assets/js"),{recursive:true});
  writeFileSync(join(root,"index.html"),"<html><body>PAY54</body></html>");
  writeFileSync(join(root,"dashboard.html"),"<html><body>Preview</body></html>");
  const r=inspectPay54FinalGoNoGo({sourceRoot:root});
  assert.equal(r.sourceDependencySafe,true);
  assert.equal(r.releaseDecision,"NO_GO");
  assert.ok(r.findings.includes("ACTIVE_PAGES_ENVIRONMENT_INDEPENDENT_VERIFICATION_REQUIRED"));
  assert.equal(r.independentProductionReviewComplete,false);
  assert.equal(r.customerAccountsChanged,false);
 }finally{rmSync(root,{recursive:true,force:true});}
});
