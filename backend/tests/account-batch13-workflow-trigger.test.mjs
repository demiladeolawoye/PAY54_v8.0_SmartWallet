"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";

const WORKFLOW=fileURLToPath(new URL("../../.github/workflows/pay54-batch13-static-link-audit.yml",import.meta.url));
const read=()=>readFileSync(WORKFLOW,"utf8");

test("413: deployment-source changes trigger Batch 13 publication checks",()=>{
 const yml=read();
 assert.match(yml,/pull_request:/);
 assert.match(yml,/branches:\s*\[project-titan\]/);
 for(const path of ['"*.html"','"assets/**"','"backend/governance/pay54-static-site-secret-markers.mjs"']){
  assert.ok(yml.includes(path),path);
 }
 assert.match(yml,/node --test backend\/tests\/account-batch13-\*\.test\.mjs/);
});
test("413: workflow has read-only token and no deployment permission",()=>{
 const yml=read();
 assert.match(yml,/permissions:\s*\n\s*contents:\s*read/);
 assert.doesNotMatch(yml,/pages:\s*write|id-token:\s*write|actions\/deploy-pages|upload-pages-artifact/);
 assert.match(yml,/persist-credentials:\s*false/);
 assert.match(yml,/PAY54_REAL_MONEY_MODE:\s*"false"/);
 assert.match(yml,/TF_VAR_authorized_provisioning:\s*"false"/);
});
test("413: CI independently executes site secret-marker source scan",()=>{
 const yml=read();
 assert.match(yml,/node backend\/governance\/pay54-static-site-secret-markers\.mjs/);
 assert.match(yml,/Keep deployment and financial execution blocked/);
});
