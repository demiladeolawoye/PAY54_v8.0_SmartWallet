"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {createPay54FounderPreviewBundle}
 from "../governance/pay54-create-founder-preview.mjs";
import {verifyPay54OfflineFounderPreview}
 from "../governance/pay54-verify-founder-preview.mjs";
const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const COMMIT="c".repeat(40);
test("630: current PAY54 founder snapshot includes all requested balance context without execution",()=>{
 const target=mkdtempSync(join(tmpdir(),"pay54-batch18-real-dashboard-"));
 try{
  const bundle=createPay54FounderPreviewBundle(ROOT,target,COMMIT);
  const html=readFileSync(join(target,"preview/index.html"),"utf8");
  for(const expected of [
   "Across wallets (converted)",
   "FX wallets enabled (demo)",
   "Device + PIN security not verified",
   "↑ +₦24,500 today",
   "sample movement (not verified)",
   "3001234567",
   "@pay54-user",
   "Level 2 sample (unverified)",
   "financial compliance: demonstration only"
  ])assert.ok(html.includes(expected),expected);
  assert.doesNotMatch(html,/<script\b/i);
  assert.match(html,/script-src 'none'/);
  assert.match(html,/connect-src 'none'/);
  assert.equal(bundle.sourceCommitSha,COMMIT);
  assert.equal(bundle.financialTransactionsEnabled,false);
  const verified=verifyPay54OfflineFounderPreview(join(target,"preview"));
  assert.equal(verified.localArtifactIntegrityPassed,true);
  assert.equal(verified.sourceCommitSha,COMMIT);
  assert.equal(verified.productionRelease,"BLOCKED");
 }finally{rmSync(target,{recursive:true,force:true});}
});
