"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const PATH=fileURLToPath(new URL(
 "../../docs/engineering/pay54-batch17-visual-qa-and-release-boundary.md",
 import.meta.url
));
const review=()=>readFileSync(PATH,"utf8");
test("Batch17 visual evidence ties exact source SHA, run and screenshot archive",()=>{
 const s=review();
 for(const evidence of [
  "3b4106cfd1539ae0c162d3c23ad522335d28099e",
  "43963717157","14275592537","12/12",
  "1440×1000","768×1024","390×844"
 ])assert.ok(s.includes(evidence),evidence);
});
test("Batch17 visual review does not assert login bypass or financial activation",()=>{
 const s=review();
 assert.match(s,/removes.*authentication, ledger, wallet, cards, payment/i);
 assert.match(s,/Existing authentication boundary/);
 assert.match(s,/NOT BYPASSED/);
 assert.match(s,/Screen-reader and complete WCAG audit \| NOT CERTIFIED/);
 assert.match(s,/production release BLOCKED/i);
});
test("Batch17 Pages source package failure and P0 impact remain distinct",()=>{
 const s=review();
 assert.match(s,/PAY54_STAGE_PUBLICATION_BOUNDARY_DENIED/);
 assert.match(s,/assets\/js\/infrastructure\/payments\/providers\/linked-card-development\.js/);
 assert.match(s,/was \*\*not bypassed or weakened\*\*/i);
 assert.match(s,/P0 remains OPEN/);
 assert.match(s,/NO-GO/);
});
