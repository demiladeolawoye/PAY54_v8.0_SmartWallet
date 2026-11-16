"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";

const SOURCE=fileURLToPath(new URL("../../docs/engineering/pay54-pages-artifact-p0-finding-20261116.md",import.meta.url));
const read=()=>readFileSync(SOURCE,"utf8");

test("478: verified artifact evidence preserves audit provenance and measured category counts",()=>{
 const body=read();
 for(const detail of [
  "43917703697","14252395793","9fa996bd385b6714087038306a6532e8e7e5ff14",
  "3ef9b7d42cde59d187ee6e9730ea351e8c3a025a796f618d9d230f93c3de1448",
  "616","348","150","106","5,485,859"
 ]) assert.ok(body.includes(detail),detail);
});
test("478: finding classifies packaging without claiming public reachability or a breach",()=>{
 const body=read();
 assert.match(body,/Confirmed overbroad artifact packaging/);
 assert.match(body,/Live exposure and impact are unknown/);
 assert.match(body,/NOT VERIFIED/);
 assert.match(body,/No Pages settings, branch rules, credentials, database privileges/);
 assert.match(body,/production release BLOCKED/);
});
test("478: live containment requires separate founder and security approval",()=>{
 const body=read();
 assert.match(body,/separate operational approval required/);
 assert.match(body,/Founder release and containment approval/);
 assert.match(body,/NOT GRANTED/);
});
