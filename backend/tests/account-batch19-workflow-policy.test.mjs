"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const WORKFLOW=fileURLToPath(new URL(
 "../../.github/workflows/pay54-batch19-release-evidence.yml",import.meta.url
));
test("693: Batch19 source-only CI is re-triggered when its canonical HTML auditor changes",()=>{
 const s=readFileSync(WORKFLOW,"utf8");
 assert.match(s,/pay54-static-site-link-audit\.mjs/);
 assert.match(s,/account-batch19-\*\.test\.mjs/);
 assert.match(s,/account-batch18-cto-release-scorecard\.test\.mjs/);
 assert.match(s,/persist-credentials: false/);
 assert.match(s,/contents: read/);
});
test("693: review workflow cannot provision, publish Pages or enable real customer money",()=>{
 const s=readFileSync(WORKFLOW,"utf8");
 assert.doesNotMatch(s,/actions\/upload-pages-artifact@/);
 assert.doesNotMatch(s,/actions\/deploy-pages@/);
 assert.doesNotMatch(s,/pages:\s*write/);
 assert.doesNotMatch(s,/id-token:\s*write/);
 assert.match(s,/PAY54_REAL_MONEY_MODE: "false"/);
 assert.match(s,/TF_VAR_authorized_provisioning: "false"/);
});

test("710: offline founder dashboard artifact is seven days and SHA-verified before upload",()=>{
 const s=readFileSync(WORKFLOW,"utf8");
 assert.match(s,/pay54-create-founder-preview\.mjs/);
 assert.match(s,/verifyPay54OfflineFounderPreview/);
 assert.match(s,/localArtifactIntegrityPassed/);
 assert.match(s,/sourceCommitSha!==process\.env\.PAY54_PREVIEW_SOURCE_SHA/);
 assert.match(s,/retention-days: 7/);
 assert.match(s,/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9/);
 assert.doesNotMatch(s,/upload-pages-artifact/);
 assert.doesNotMatch(s,/deploy-pages/);
});
