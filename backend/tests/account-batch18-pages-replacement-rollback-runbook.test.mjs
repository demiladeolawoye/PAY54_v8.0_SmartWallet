"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const PATH=fileURLToPath(new URL(
 "../../docs/engineering/pay54-batch18-pages-replacement-rollback-runbook.md",
 import.meta.url
));
const read=()=>readFileSync(PATH,"utf8");
test("662: owner must verify current deployment and protected Pages environment before publication",()=>{
 const s=read();
 for(const phrase of [
  "Settings → Pages","github-pages","protected branch/ruleset",
  "commit SHA","artifact digest","rollback artifact"
 ])assert.ok(s.includes(phrase),phrase);
 assert.match(s,/No setting is changed during evidence collection/);
 assert.match(s,/Never upload the repository checkout root/);
});
test("662: old overbroad archive cannot become an assumed known-good rollback",()=>{
 const s=read();
 assert.match(s,/14252395793/);
 assert.match(s,/do \*\*not\*\* call it a known-good safe rollback/);
 assert.match(s,/previously verified safe/);
});
test("662: independent QA requires dashboard and linked-card disable/approved provider before deployment",()=>{
 const s=read();
 for(const text of ["tablet Money Moves","linked-card feature-unavailable",
  "screen-reader","four restored balance details","KYC/AML","tenant RLS"]){
  assert.ok(s.includes(text),text);
 }
 assert.match(s,/Current NO-GO reasons/);
 assert.match(s,/No automation in this batch changes Pages Settings/);
});
