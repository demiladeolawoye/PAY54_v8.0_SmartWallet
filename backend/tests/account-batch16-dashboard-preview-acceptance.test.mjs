"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";

const SOURCE=fileURLToPath(new URL("../../docs/engineering/pay54-dashboard-preview-acceptance.md",import.meta.url));
const read=()=>readFileSync(SOURCE,"utf8");

test("522: dashboard can be reviewed without falsely claiming Batch 13–15 UI deployment",()=>{
 const s=read();
 assert.match(s,/not.*automatically visible as a redesigned or upgraded dashboard/i);
 assert.match(s,/unmerged draft PRs/);
 assert.match(s,/dashboard\.html/);
 assert.match(s,/Availability and security NOT VERIFIED/);
});
test("522: preview cannot use live identity or money operations",()=>{
 const s=read();
 for(const phrase of ["synthetic-data mode","no real wallet balance",
  "no real","No repository-root publishing","production remains BLOCKED"]){
  assert.ok(s.toLowerCase().includes(phrase.toLowerCase()),phrase);
 }
});
test("522: preview requires independent QA and owner deployment acceptance",()=>{
 const s=read();
 assert.match(s,/Security, QA and Founder sign off/);
 assert.match(s,/mobile-first dashboard layouts/);
 assert.match(s,/keyboard and screen-reader navigation/);
 assert.match(s,/does not activate preview hosting/);
});
