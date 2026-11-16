"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const DOC=fileURLToPath(new URL(
 "../../docs/engineering/pay54-batch18-founder-dashboard-acceptance.md",
 import.meta.url
));
const read=()=>readFileSync(DOC,"utf8");
test("664: founder balance review retains visible account context but not verified money claims",()=>{
 const s=read();
 for(const phrase of ["Across wallets (converted)","↑ +₦24,500 today",
  "3001234567","@pay54-user","Level 2","demonstration only — not verified"]){
  assert.ok(s.includes(phrase),phrase);
 }
 assert.match(s,/not.*genuine account credentials, settled funds, verified KYC/);
});
test("664: prior visual screenshots cannot attest a future release commit",()=>{
 const s=read();
 for(const viewport of ["1440×1000","768×1024","390×844"]){
  assert.ok(s.includes(viewport),viewport);
 }
 assert.match(s,/regenerated for the exact future release SHA/);
 assert.match(s,/not an authenticated customer session or a full accessibility certification/);
});
test("664: no customer exposure without server-side provider control and P0 review",()=>{
 const s=read();
 assert.match(s,/no frontend-only hiding/);
 assert.match(s,/Live Pages \| Actual settings and current deployed artifact/);
 assert.match(s,/A public hosted dashboard replacement is not approved/);
 assert.match(s,/Do not submit real credentials/);
});
