"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {auditPay54PagesWorkflowSource}
 from "../governance/pay54-pages-workflow-source-audit.mjs";

const safe=(path="site")=>[
 "name: PAY54 restricted Pages deployment",
 "permissions:",
 "  contents: read",
 "  pages: write",
 "  id-token: write",
 "jobs:",
 "  publish:",
 "    steps:",
 "      - name: Checkout",
 "        uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803",
 "        with:",
 "          persist-credentials: false",
 "      - name: Upload Pages",
 "        uses: actions/upload-pages-artifact@0123456789012345678901234567890123456789",
 "        with:",
 "          path: "+path,
 "      - name: Deploy",
 "        uses: actions/deploy-pages@0123456789012345678901234567890123456789"
].join("\n");

test("519: restricted Pages upload root is a source declaration, not live approval",()=>{
 const report=auditPay54PagesWorkflowSource(safe());
 assert.equal(report.uploadStepCount,1);
 assert.equal(report.restrictedUploadPathDeclared,true);
 assert.deepEqual(report.findings,[]);
 assert.equal(report.liveWorkflowIndependentlyVerified,false);
 assert.equal(report.deploymentApproved,false);
 assert.equal(report.productionRelease,"BLOCKED");
});
test("519: repository root, checkout and parent directory cannot be Pages upload",()=>{
 for(const path of [".","./","..","./..","/","./backend"]){
  const r=auditPay54PagesWorkflowSource(safe(path));
  assert.ok(r.findings.includes("UNSAFE_PAGES_UPLOAD_ROOT"));
 }
});
test("519: omitted explicit upload path fails closed",()=>{
 const r=auditPay54PagesWorkflowSource(safe().replace("          path: site\n",""));
 assert.ok(r.findings.includes("UNSAFE_PAGES_UPLOAD_ROOT"));
});
test("519: missing credential persistence control and broad repo write are findings",()=>{
 const r=auditPay54PagesWorkflowSource(safe()
  .replace("persist-credentials: false","persist-credentials: true")
  .replace("contents: read","contents: write"));
 assert.ok(r.findings.includes("CREDENTIAL_PERSISTENCE_NOT_DISABLED"));
 assert.ok(r.findings.includes("WRITE_ACCESS_UNEXPECTED"));
});
test("519: multiple Pages uploads and dynamic paths require review",()=>{
 const duplicated=safe().replace("      - name: Deploy",
  "      - name: Second upload\n        uses: actions/upload-pages-artifact@0123456789012345678901234567890123456789\n        with:\n          path: site\n      - name: Deploy");
 const r=auditPay54PagesWorkflowSource(duplicated);
 assert.ok(r.findings.includes("UPLOAD_STEP_COUNT_INVALID"));
});
test("519: the audit cannot be invoked on non-source values",()=>{
 assert.throws(()=>auditPay54PagesWorkflowSource(null),/SOURCE_REQUIRED/);
});
