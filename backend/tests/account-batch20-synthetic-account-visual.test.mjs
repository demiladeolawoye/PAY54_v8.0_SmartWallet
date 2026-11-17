"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {createPay54BalanceVisualFixture}
 from "../governance/pay54-balance-visual-fixture.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
test("748: synthetic browser fixture renders new dashboard and account selector without first-paint lock",()=>{
 const folder=mkdtempSync(join(tmpdir(),"pay54-batch20-synthetic-ui-"));
 try{
  writeFileSync(join(folder,"dashboard.html"),
   readFileSync(join(ROOT,"dashboard.html"),"utf8"));
  const report=createPay54BalanceVisualFixture({sourceRoot:folder});
  const html=readFileSync(report.fixtureFile,"utf8");
  assert.match(html,/<html lang="en">/);
  assert.doesNotMatch(html,/<html[^>]*class="p54b-boot-pending"/);
  assert.match(html,/src="\.pay54-qa-auth-session\.js"/);
  assert.doesNotMatch(html,/PAY54_ACCOUNT_CONTEXT_TEST_ONLY = true/);
  const authMock=readFileSync(join(folder,".pay54-qa-auth-session.js"),"utf8");
  assert.match(authMock,/PAY54_ACCOUNT_CONTEXT_TEST_ONLY=true/);
  assert.match(authMock,/isAuthenticated:\(\)=>true/);
  assert.match(html,/assets\/js\/ui\/account-context-selector\.js/);
  assert.match(html,/assets\/js\/dashboard-blueprint-shell\.js/);
  assert.doesNotMatch(html,/<script\b[^>]*src="assets\/js\/(?:ledger|transactions|security|services|engine|core)\b/i);
  assert.equal(report.authenticSessionUsed,false);
  assert.equal(report.paymentEnginesLoaded,false);
  assert.equal(report.publicSiteDeployed,false);
  assert.equal(report.productionRelease,"BLOCKED");
 }finally{rmSync(folder,{recursive:true,force:true});}
});
test("748: mock auth is restricted to synthetic fixture output, not live dashboard source",()=>{
 const html=readFileSync(join(ROOT,"dashboard.html"),"utf8");
 assert.doesNotMatch(html,/PAY54_ACCOUNT_CONTEXT_TEST_ONLY/);
 assert.doesNotMatch(html,/PAY54_SECURITY\s*=\s*\{session/);
 assert.match(html,/<html lang="en" class="p54b-boot-pending">/);
});
