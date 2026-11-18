"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";

const FILE=fileURLToPath(new URL("../../docs/engineering/pay54-batch14-signed-evidence-trust-policy.md",import.meta.url));
const load=()=>readFileSync(FILE,"utf8");

test("437: signing-key provenance and custody are mandatory operational dependencies",()=>{
 const policy=load();
 for(const phrase of [
  "Independent trust registry",
  "Private-key custody",
  "Signer separation",
  "Replay and binding",
  "Evidence freshness",
  "Multiple approvers",
  "Key compromise",
  "revocation status",
  "non-exportable"
 ]){
  assert.ok(policy.includes(phrase),phrase);
 }
});
test("437: signed receipts never activate release or claim trusted-key provenance",()=>{
 const policy=load();
 assert.match(policy,/valid signature proves only/);
 assert.match(policy,/never sufficient by itself/);
 assert.match(policy,/releaseAuthorised:false/);
 assert.match(policy,/productionRelease:"BLOCKED"/);
 assert.match(policy,/No release, account switch, customer database access or money movement/);
});
