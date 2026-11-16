"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const DOC=fileURLToPath(new URL(
 "../../docs/engineering/pay54-batch18-active-pages-evidence.md",import.meta.url
));
test("624: Pages evidence matrix separates historic archive from current live URL exposure",()=>{
 const source=readFileSync(DOC,"utf8");
 for(const item of ["14252395793","43917703697","348 backend files",
  "150 documentation files","one infrastructure file","616 files"]){
  assert.ok(source.includes(item),item);
 }
 assert.match(source,/not.*proof that the active public website currently serves those paths/i);
 assert.match(source,/neither proof of public unavailability nor proof of safe deployment/);
});
test("624: owner checklist requires live Pages settings, protected deployment and rollback",()=>{
 const source=readFileSync(DOC,"utf8");
 for(const text of ["settings/pages","github-pages","Rulesets",
  "commit SHA","artifact ID/digest","required reviewers","rollback"]){
  assert.ok(source.includes(text),text);
 }
 assert.match(source,/HEAD 200 is not content proof/);
 assert.match(source,/404 for a sample path does not prove all internal files are inaccessible/);
});
test("624: owner-supplied evidence and engineering source changes do not authorise deployment",()=>{
 const source=readFileSync(DOC,"utf8");
 assert.match(source,/complete form is not independent attestation/);
 assert.match(source,/separate Founder\/Security\/Release approval/);
 assert.match(source,/No-GO/);
 assert.match(source,/PRs remain draft/);
});
