"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const WORKFLOW=fileURLToPath(new URL(
 "../../.github/workflows/pay54-batch18-publication-dependency.yml",import.meta.url));
const source=()=>readFileSync(WORKFLOW,"utf8");
test("658: Batch18 CI is source-only with no Pages deploy or financial secrets",()=>{
 const s=source();
 assert.match(s,/permissions:\s*\n\s*contents: read/);
 assert.match(s,/persist-credentials: false/);
 assert.match(s,/PAY54_REAL_MONEY_MODE: "false"/);
 assert.match(s,/TF_VAR_authorized_provisioning: "false"/);
 assert.doesNotMatch(s,/actions\/upload-pages-artifact@/);
 assert.doesNotMatch(s,/actions\/deploy-pages@/);
 assert.doesNotMatch(s,/pages:\s*write/);
 assert.doesNotMatch(s,/id-token:\s*write/);
});
test("658: only a short-lived inert founder artifact can be uploaded from this job",()=>{
 const s=source();
 assert.match(s,/actions\/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9/);
 assert.match(s,/retention-days: 7/);
 assert.match(s,/pay54-batch18-founder-preview\/preview\//);
 assert.match(s,/node backend\/governance\/pay54-create-founder-preview\.mjs/);
 assert.match(s,/verifyPay54OfflineFounderPreview/);
 assert.match(s,/releaseDecision!=="NO_GO"/);
});
