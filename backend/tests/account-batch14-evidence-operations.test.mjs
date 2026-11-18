"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {PAY54_RELEASE_GATES} from "../governance/pay54-release-evidence-review.mjs";

const PATH=fileURLToPath(new URL("../../docs/engineering/pay54-batch14-release-evidence-operations.md",import.meta.url));
const source=()=>readFileSync(PATH,"utf8");

test("425: operational runbook includes every mandatory release evidence category",()=>{
 const doc=source();
 for(const gate of PAY54_RELEASE_GATES){
  assert.ok(doc.includes("| "+gate+" |"),"Missing independent evidence gate: "+gate);
 }
 assert.equal(PAY54_RELEASE_GATES.length,9);
});
test("425: documentation never treats test metadata as authentic approval",()=>{
 const doc=source();
 assert.match(doc,/checks supplied metadata only/);
 assert.match(doc,/cannot verify that an export is authentic/);
 assert.match(doc,/never authorises deployment/);
 assert.match(doc,/production release remain BLOCKED/);
});
test("425: privacy, owner acceptance and evidence provenance are enforced",()=>{
 const doc=source();
 assert.match(doc,/Keep private screenshots, tokens, provider agreements and customer information outside/);
 assert.match(doc,/workflow run and job identifiers/);
 assert.match(doc,/Founder, Security and Release Manager/);
 assert.match(doc,/Do not copy user\/customer data/);
});
