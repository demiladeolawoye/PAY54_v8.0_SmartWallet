"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const DOC=fileURLToPath(new URL("../../docs/engineering/pay54-founder-offline-dashboard-preview-guide.md",import.meta.url));
const read=()=>readFileSync(DOC,"utf8");
test("556: founder can open single HTML or extracted offline Actions ZIP",()=>{
 const doc=read();
 for(const text of ["Single-file HTML","Verified GitHub Actions ZIP",
  "index.html","preview-manifest.json","source commit","SHA-256"]){
  assert.ok(doc.includes(text),text);
 }
});
test("556: founder preview explicitly excludes real banking and regulatory acceptance",()=>{
 const doc=read();
 assert.match(doc,/controls are visually present but nonfunctional/i);
 assert.match(doc,/source JavaScript engines are omitted/i);
 assert.match(doc,/No partner integration, authentication, KYC, real balance/);
 assert.match(doc,/Production stays \*\*BLOCKED\*\*/);
});
test("556: actual Pages P0 remains unresolved and separate from offline ZIP",()=>{
 const doc=read();
 assert.match(doc,/public Pages website to enter passwords/i);
 assert.match(doc,/older deployment artifact was confirmed overbroad/i);
 assert.match(doc,/different, restricted artifact/i);
});
