"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";

const RUNBOOK=fileURLToPath(new URL("../../docs/engineering/pay54-pages-publication-containment-runbook.md",import.meta.url));
const read=()=>readFileSync(RUNBOOK,"utf8");

test("416: Pages runbook requires independently verified source, artifact and public reachability",()=>{
 const body=read();
 for(const required of [
  "Settings → Pages",
  "PAGES-01 source configuration",
  "PAGES-02 artifact boundary",
  "PAGES-03 public reachability",
  "PAGES-06 GitHub controls",
  "PAGES-07 user journeys",
  "PAGES-08 rollback",
  "PAGES-09 approval",
  "NOT VERIFIED",
  "NO-GO"
 ]){
  assert.ok(body.includes(required),required);
 }
});
test("416: source review cannot be mistaken for production evidence or leak confirmation",()=>{
 const body=read();
 assert.match(body,/does \*\*not\*\* prove a particular backend URL was accessible/);
 assert.match(body,/2xx HEAD response cannot establish matching file content/);
 assert.match(body,/sampled 404 does not prove the overall site safe/);
 assert.match(body,/production publication risk P-01 remains OPEN/);
});
test("416: runbook requires explicit owner approval and retains release block",()=>{
 const body=read();
 assert.match(body,/requires separate approval/);
 assert.match(body,/Founder \+ Security \+ Release decision/);
 assert.match(body,/No real-money, account switching, database access/);
 assert.match(body,/Go\/no-go/);
});
