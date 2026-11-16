"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const DOC=fileURLToPath(new URL(
 "../../docs/engineering/pay54-batch18-linked-card-production-decision.md",
 import.meta.url
));
const read=()=>readFileSync(DOC,"utf8");
test("660: linked-card production choice identifies existing provider and adapter without relocation",()=>{
 const s=read();
 for(const x of [
  "assets/js/infrastructure/payments/providers/linked-card-development.js",
  "assets/js/engine/funding/adapters/linked-card.js",
  "assets/js/services/funding.js",
  "getHealth","authorize","commit","reverse"
 ]) assert.ok(s.includes(x),x);
 assert.match(s,/Moving the simulator into another allowed directory.*forbidden/);
});
test("660: approved provider demands server-side payment and compliance obligations",()=>{
 const s=read();
 for(const x of ["SCA/3DS","PCI scope","signed webhook",
  "idempotency","chargeback","Ledger","reconciliation"]){
  assert.ok(s.toLowerCase().includes(x.toLowerCase()),x);
 }
});
test("660: public preview feature suspension cannot just hide a frontend button",()=>{
 const s=read();
 assert.match(s,/Merely hiding a frontend button is \*\*insufficient\*\*/);
 assert.match(s,/no linked-card quotes\/authorisations\/commits\/reversals/);
 assert.match(s,/not deployed or separately approved/);
 assert.match(s,/NO-GO/);
});
