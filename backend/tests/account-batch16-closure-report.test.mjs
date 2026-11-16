"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const FILE=fileURLToPath(new URL("../../docs/engineering/pay54-batch16-closure-report.md",import.meta.url));
const read=()=>readFileSync(FILE,"utf8");

test("566: founder report identifies actual offline dashboard deliverable and its limitations",()=>{
 const s=read();
 for(const v of ["standalone single-file offline preview","preview-manifest.json",
  "exact PR head","no JavaScript","offline","WCAG"]){
  assert.ok(s.toLowerCase().includes(v.toLowerCase()),v);
 }
 assert.match(s,/not a production environment/);
});
test("566: real GitHub Pages packaging defect and reachability uncertainty survive closure",()=>{
 const s=read();
 for(const n of ["348 backend files","150 documentation files",
  "one infrastructure file","UNVERIFIED","P0"]){
  assert.ok(s.includes(n),n);
 }
 assert.match(s,/not proof of current public endpoint reachability or credential compromise/);
});
test("566: unresolved backend/account and financial launch acceptance remain explicit",()=>{
 const s=read();
 for(const v of ["PostgreSQL RLS","KYC/AML","safeguarding","UK–Nigeria",
  "No regulated real-money authority"]){
  assert.ok(s.includes(v),v);
 }
});
test("566: founder and security approvals remain independent of source progress",()=>{
 const s=read();
 assert.match(s,/No review PR was merged/);
 assert.match(s,/No production website, Pages settings/);
 assert.match(s,/Batch 17 \(568–617\) requires fresh approval/);
 assert.match(s,/BLOCKED \/ NO-GO/);
});
