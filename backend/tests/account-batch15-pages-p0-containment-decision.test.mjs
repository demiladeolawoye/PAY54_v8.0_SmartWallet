"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const FILE=fileURLToPath(new URL("../../docs/engineering/pay54-pages-p0-containment-decision.md",import.meta.url));
const doc=()=>readFileSync(FILE,"utf8");

test("513: Pages P0 decision record retains verified artifact provenance",()=>{
 const s=doc();
 for(const evidence of [
  "43917703697","14252395793",
  "9fa996bd385b6714087038306a6532e8e7e5ff14",
  "616 regular files","348","150","infrastructure"
 ]){
  assert.ok(s.includes(evidence),evidence);
 }
});
test("513: packaging failure is not falsely reported as a live confirmed breach",()=>{
 const s=doc();
 assert.match(s,/confirmed violation of the static-site publication-package boundary/);
 assert.match(s,/does not prove that the files are currently reachable/);
 assert.match(s,/not proof of a usable private key/);
 assert.match(s,/Live internal-file URL reachability \| Security \| UNVERIFIED/);
 assert.match(s,/P0 OPEN/);
});
test("513: containment and financial launch remain subject to independent approval",()=>{
 const s=doc();
 assert.match(s,/independent operational approval/);
 assert.match(s,/Founder and Security owner decide/);
 assert.match(s,/No automatic deployment/);
 assert.match(s,/no customer money movement/);
 assert.match(s,/PostgreSQL tenant RLS/);
});
