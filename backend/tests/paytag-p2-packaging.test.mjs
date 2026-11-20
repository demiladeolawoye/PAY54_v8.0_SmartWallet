"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const read=relative=>readFileSync(fileURLToPath(new URL(relative,import.meta.url)),"utf8");

test("P2A GitHub Actions workflow is executable YAML, never markdown",()=>{
  const workflow=read("../../.github/workflows/pay54-paytag-p2-foundation.yml");
  assert.match(workflow,/^name: PAY54 PayTag P2A Registry Schema Source Gate$/m);
  assert.match(workflow,/^on:\s*$/m);
  assert.match(workflow,/^\s+pull_request:\s*$/m);
  assert.match(workflow,/^\s+permissions:\s*$/m);
  assert.match(workflow,/^\s+contents: read\s*$/m);
  assert.match(workflow,/node --test backend\/tests\/paytag-p2-schema-contract\.test\.mjs/);
  assert.match(workflow,/backend\/tests\/paytag-p2-packaging\.test\.mjs/);
  assert.doesNotMatch(workflow,/^# CR-PAYTAG-01 — P2A Registry Persistence Foundation/);
});
test("P2A architecture file is documentation, never mislocated workflow",()=>{
  const docs=read("../../docs/architecture/CR-PAYTAG-01-p2-persistence-foundation.md");
  assert.match(docs,/^# CR-PAYTAG-01 — P2A Registry Persistence Foundation/m);
  assert.match(docs,/FORCE RLS/);
  assert.match(docs,/production/);
  assert.doesNotMatch(docs,/^name: PAY54 PayTag P2A Registry Schema Source Gate/);
});
