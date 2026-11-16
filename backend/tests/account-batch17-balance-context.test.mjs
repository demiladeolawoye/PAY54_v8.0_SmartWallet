"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const read=path=>readFileSync(new URL(path, "file://"+ROOT), "utf8");
const html=()=>read("./dashboard.html");
const shell=()=>read("./assets/js/dashboard-blueprint-shell.js");
const css=()=>read("./assets/css/dashboard-blueprint-refinements.css");

test("573: restored balance context remains in existing source dashboard HTML",()=>{
 const s=html();
 for(const item of [
  'class="balance-meta"',
  'class="balance-delta pos"',
  'class="identity"',
  'class="trust-chip"',
  "Across wallets (converted)",
  "FX wallets enabled (demo)",
  "↑ +₦24,500 today",
  "3001234567",
  "@pay54-user",
  "KYC:",
  "Level 2 sample (unverified)",
  "financial compliance: demonstration only"
 ]) assert.ok(s.includes(item),item);
 assert.match(s,/security not verified/);
 assert.match(s,/sample movement \(not verified\)/);
});

test("573: blueprint does not conceal requested balance detail nodes",()=>{
 const s=shell();
 assert.match(s,/\.balance-meta", "\.balance-delta", "\.identity", "\.trust-chip"/);
 assert.match(s,/detail\.removeAttribute\("hidden"\)/);
 assert.match(s,/detail\.classList\.remove\("p54b-conceal"\)/);
 assert.match(s,/detail\.classList\.add\("p54b-balance-detail"\)/);
 assert.doesNotMatch(s,/find\("\.balance-delta", balance\)\?\.setAttribute\("hidden", ""\)/);
 assert.doesNotMatch(s,/\["\.balance-meta", "\.identity", "\.trust-chip", "#fxTicker"\]/);
});

test("573: balance context uses mobile responsive styling without fixed-height truncation",()=>{
 const s=css();
 assert.match(s,/PAY54 Balance Context Visibility/);
 assert.match(s,/body\.p54-blueprint \.p54b-balance\.card \{\s*height: auto;/);
 assert.match(s,/\.p54b-balance \.p54b-balance-detail \{/);
 assert.match(s,/overflow-wrap: anywhere/);
 assert.match(s,/@media \(max-width: 640px\)/);
});

test("573: refreshed assets are requested while preview claims remain unverified",()=>{
 const s=html();
 assert.match(s,/dashboard-blueprint-refinements\.css\?v=1\.5\.3/);
 assert.match(s,/dashboard-blueprint-shell\.js\?v=1\.2\.4/);
 assert.match(s,/preview-claims-guard\.js\?v=1\.0\.1/);
 assert.doesNotMatch(s,/Security &amp; Financial compliance active/);
 assert.doesNotMatch(s,/>KYC: <strong>Level 2<\/strong>/);
});
