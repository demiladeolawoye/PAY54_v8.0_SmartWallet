"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const FILE=fileURLToPath(new URL("../../docs/engineering/pay54-batch15-closure-report.md",import.meta.url));
const report=()=>readFileSync(FILE,"utf8");

test("516: source completion remains distinct from operational launch acceptance",()=>{
 const s=report();
 assert.match(s,/Production release:\*\* BLOCKED \/ NO-GO/);
 assert.match(s,/Completion of a source cycle must not automatically close P0/);
 assert.match(s,/do not merge the stacked draft pull requests automatically/i);
 assert.match(s,/No GitHub Pages settings, production branch rules, credentials/);
});
test("516: concrete Pages P0 source evidence and limitations remain recorded",()=>{
 const s=report();
 for(const v of ["14252395793","43917703697","616","348","150",
  "UNVERIFIED","credential compromise"]) assert.ok(s.includes(v),v);
 assert.match(s,/artifact packaging failure/);
 assert.match(s,/read-only metadata inspection/);
});
test("516: operational blockers and change request actions are explicit",()=>{
 const s=report();
 for(const name of [
  "CR-PAGES-01","CR-PAGES-02","CR-DEVOPS-01",
  "CR-SECURITY-01","CR-FINTECH-01","CR-QA-01","CR-UX-01",
  "PostgreSQL tenant RLS","safeguarding","rollback"
 ])assert.ok(s.includes(name),name);
});
test("516: next approval boundary is not silently skipped",()=>{
 const s=report();
 assert.match(s,/Batch 16 \(518–567\) requires separate approval/);
 assert.match(s,/468–517 reaches 50\/50 when item 517 commits/);
});
