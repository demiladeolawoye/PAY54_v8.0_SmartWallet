"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54PagesScriptDependencies as inspect}
 from "../governance/pay54-batch27-pages-script-inventory.mjs";
test("1109: development funding provider in browser scripts blocks public release",()=>{
 const r=inspect({html:'<script src="assets/js/infrastructure/payments/providers/linked-card-development.js"></script>'});
 assert.equal(r.browserReleaseCandidateSafe,false);
 assert.equal(r.cashOrCardFundingApproved,false);
 assert.equal(r.deploymentAuthorised,false);
});
test("1109: static-only browser script can pass source classification, not deployed safety",()=>{
 const r=inspect({html:'<script src="assets/js/app.js"></script>',
  jsSources:{"assets/js/app.js":'document.title="PAY54";'}});
 assert.equal(r.browserReleaseCandidateSafe,true);
 assert.equal(r.remotePublishedBundleInspected,false);
});
test("1109: script maps, dynamic execution, duplicate and external URL deny or flag",()=>{
 assert.throws(()=>inspect({html:'<script src="https://evil.example/e.js"></script>'}),
 /PAGES_SCRIPT_DEPENDENCY_DENIED/);
 assert.throws(()=>inspect({html:'<script src="app.js"></script><script src="app.js"></script>'}),
 /PAGES_SCRIPT_DEPENDENCY_DENIED/);
 assert.equal(inspect({html:'<html>PAY54</html>',
  jsSources:{"app.js":'eval("PAY54")'}}).browserReleaseCandidateSafe,false);
});
