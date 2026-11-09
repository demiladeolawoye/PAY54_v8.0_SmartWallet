
"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  compileReviewerPacket,
  renderReviewerPacket
} from "../governance/staging-reviewer-packet.mjs";

const read = name =>
  JSON.parse(
    readFileSync(
      new URL(`../governance/${name}`, import.meta.url),
      "utf8"
    )
  );

const register = read("staging-evidence-register.json");
const intake = read("staging-evidence-submissions.json");
const observations = read("staging-observations.json");

const run = (
  r = register,
  i = intake,
  o = observations
) => compileReviewerPacket(r, i, o);

function assertFailClosed(packet) {
  assert.equal(packet.release, "BLOCKED");
  assert.equal(packet.deploymentAuthorized, false);
  assert.equal(packet.provisioningAuthorized, false);
  assert.equal(packet.financialExecutionAuthorized, false);
  assert.equal(packet.independentReviewerAssigned, false);
  assert.equal(packet.authenticatedEvidenceCount, 0);
  assert.equal(packet.independentApprovalCount, 0);

  for (const c of packet.controls) {
    assert.equal(c.evidenceAuthenticated, false);
    assert.equal(c.independentlyApproved, false);
  }
}

test("real observation register compiles a reviewer-only packet", () => {
  const p = run();

  assert.equal(
    p.integrityPassed,
    true,
    p.errors.join("; ")
  );

  assert.deepEqual(
    p.controls.map(c => c.id),
    ["STG-02", "STG-03", "STG-04"]
  );

  assert.deepEqual(
    p.controls.map(c => c.observationIds[0]),
    ["OBS-STG02-001", "OBS-STG03-001", "OBS-STG04-001"]
  );

  assertFailClosed(p);
});

test("report distinguishes observations from independently verified evidence", () => {
  const s = renderReviewerPacket(run());

  assert.match(s, /Unauthenticated user-provided screenshots/);
  assert.match(s, /Authenticated cloud evidence: \*\*0\*\*/);
  assert.match(s, /Staging release: \*\*BLOCKED\*\*/);
  assert.match(s, /budget is not a hard spending cap/);
  assert.match(s, /key creation\/upload restrictions/);

  assert.doesNotMatch(
    s,
    /independently approved: \*\*YES\*\*/
  );
});

test("an altered baseline status fails and cannot approve", () => {
  const r = structuredClone(register);
  r.controls.find(c => c.id === "STG-03").status = "NOT_VERIFIED";

  const p = run(r);

  assert.equal(p.integrityPassed, false);
  assertFailClosed(p);
});

test("a forged observation authentication claim fails", () => {
  const o = structuredClone(observations);
  o.authentication = "AUTHENTICATED";

  const p = run(register, intake, o);

  assert.equal(p.integrityPassed, false);
  assertFailClosed(p);
});

test("unexpected evidence candidate fails closed", () => {
  const i = structuredClone(intake);
  i.deploymentAuthorized = true;

  const p = run(register, i);

  assert.equal(p.integrityPassed, false);
  assertFailClosed(p);
});

test("missing scoped observation fails closed", () => {
  const o = structuredClone(observations);

  o.observations = o.observations.filter(
    x => x.controlId !== "STG-04"
  );

  const p = run(register, intake, o);

  assert.equal(p.integrityPassed, false);
  assertFailClosed(p);
});

test("unknown control observation is rejected", () => {
  const o = structuredClone(observations);
  o.observations[0].controlId = "STG-99";

  const p = run(register, intake, o);

  assert.equal(p.integrityPassed, false);
  assertFailClosed(p);
});
