"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const FILE=fileURLToPath(new URL("../../docs/engineering/pay54-pages-active-deployment-evidence-request.md",import.meta.url));
const text=()=>readFileSync(FILE,"utf8");
test("563: Pages operational review explicitly identifies active deployment evidence",()=>{
 const s=text();
 for(const value of [
  "43917703697","14252395793","settings/pages",
  "Actions","Environments","github-pages","Rulesets",
  "deployment commit SHA","artifact ID","UTC time"
 ])assert.ok(s.includes(value),value);
});
test("563: historical archive packaging does not falsely prove live reachability or compromise",()=>{
 const s=text();
 assert.match(s,/It does not prove those exact files are served/);
 assert.match(s,/usable credential or customer data was exposed/);
 assert.match(s,/UNVERIFIED/);
 assert.match(s,/HEAD 200 is not content proof/);
});
test("563: live config, breach and deployment decisions are separate approvals",()=>{
 const s=text();
 assert.match(s,/Do not click Save or change the source/);
 assert.match(s,/NOT APPROVED/);
 assert.match(s,/Founder \+ Security \+ Release/);
 assert.match(s,/BLOCKED \/ NO-GO/);
});
test("563: offline preview cannot collect private banking data",()=>{
 const s=text();
 assert.match(s,/Never enter real banking credentials, KYC documents or customer information/);
 assert.match(s,/no public preview website was deployed/);
});
