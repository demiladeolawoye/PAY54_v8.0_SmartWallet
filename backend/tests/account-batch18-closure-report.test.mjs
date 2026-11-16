"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const PATH=fileURLToPath(new URL(
 "../../docs/engineering/pay54-batch18-closure-report.md",import.meta.url
));
const read=()=>readFileSync(PATH,"utf8");
test("666: CTO Batch18 report accounts for the whole auditable 50-source cycle",()=>{
 const s=read();
 for(const part of ["618–620","621–624","625–628","629–630","633–636",
  "640–641","648–650","655–658","659–660","661–662","663–664","665–667"]){
  assert.ok(s.includes(part),part);
 }
 assert.match(s,/50 individually auditable source deliverables/);
 assert.match(s,/Batch 19 cycle \(668–717\)/);
});
test("666: report does not equate historical Pages archive contents with current compromise",()=>{
 const s=read();
 for(const text of ["14252395793","348 backend files",
  "150 documentation files","one infrastructure file","NOT VERIFIED"]){
  assert.ok(s.includes(text),text);
 }
 assert.match(s,/not.*independently confirmed current public URL exposure/i);
});
test("666: working linked-card development module is not promoted or silently removed",()=>{
 const s=read();
 assert.match(s,/assets\/js\/infrastructure\/payments\/providers\/linked-card-development\.js/);
 assert.match(s,/No mock has been promoted or relocated/);
 assert.match(s,/DECISION OPEN/);
});
test("666: no source CI or founder approval silently deploys or funds money",()=>{
 const s=read();
 assert.match(s,/PR #6 remains DRAFT, unmerged and stacked/);
 assert.match(s,/No GitHub Pages deployment, settings or OIDC\/deployer permission changes/);
 assert.match(s,/No financial engine, ledger, card issuer/);
 assert.match(s,/production \*\*NO-GO\*\*/);
});
