<CodeBlock language="javascript" editable>
"use strict";

/* PAY54 Phase 2G-U — consolidated release gate regression tests v1.0.0 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  assessStagingRelease,
  renderGateSummary,
  evaluateCheckout
} from "../governance/staging-release-gate.mjs";

const read = path => JSON.parse(
  readFileSync(new URL(path, import.meta.url), "utf8")
);

const baseline = read(
  "../governance/staging-evidence-register.json"
);

const intake = read(
  "../governance/staging-evidence-submissions.json"
);

const clone = value => structuredClone(value);

function assertBlocked(result) {
  assert.equal(result.release, "BLOCKED");
  assert.equal(result.deploymentAuthorized, false);
  assert.equal(result.provisioningAuthorized, false);
  assert.equal(result.financialExecutionAuthorized, false);
  assert.equal(result.independentlyApprovedControls, 0);
  assert.equal(result.authenticatedVerifications, 0);
}

test(
  "valid existing evidence contracts pass integrity but never approve deployment",
  () => {
    const report = assessStagingRelease(baseline, intake);

assert.equal(report.integrityPassed, true);
    assert.equal(report.controls.length, 7);
    assertBlocked(report);
  }
);

test("a forged register approval fails closed", () => {
  const forged = clone(baseline);
  forged.controls[0].status = "VERIFIED";

  const report = assessStagingRelease(forged, intake);

assert.equal(report.integrityPassed, false);
  assertBlocked(report);
});

test(
  "input flags cannot authorise provisioning or financial execution",
  () => {
    for (const flag of [
      "deploymentAuthorized",
      "provisioningAuthorized",
      "financialExecutionAuthorized"
    ]) {
      const modified = clone(intake);
      modified[flag] = true;

      const report = assessStagingRelease(baseline, modified);

assert.equal(report.integrityPassed, false, flag);
      assertBlocked(report);
    }
  }
);

test(
  "candidate evidence cannot be misrepresented as independent approval",
  () => {
    const report = assessStagingRelease(baseline, intake);

assert.equal(report.candidateEvidence, 0);
    assert.equal(report.independentlyApprovedControls, 0);
    assertBlocked(report);
  }
);

test(
  "missing workflows are disclosed without becoming release approval",
  () => {
    const report = assessStagingRelease(baseline, intake, {
      ".github/workflows/pay54-staging-deploy.yml": false
    });

    assert.equal(report.integrityPassed, true);

assert.deepEqual(report.missingWorkflows, [
      ".github/workflows/pay54-staging-deploy.yml"
    ]);

assertBlocked(report);
  }
);

test("invalid workflow inventory is rejected", () => {
  const report = assessStagingRelease(
    baseline,
    intake,
    { check: "yes" }
  );

assert.equal(report.integrityPassed, false);
  assertBlocked(report);
});

test(
  "summary clearly distinguishes integrity PASS from release BLOCKED",
  () => {
    const summary = renderGateSummary(
      assessStagingRelease(baseline, intake)
    );

assert.match(
summary,
/Source-policy integrity: **PASS**/
);

assert.match(
summary,
/Staging release: **BLOCKED**/
);

assert.match(
summary,
/Independently authenticated approvals: **0**/
);
}
);

test("actual checkout is assessed without file modification", () => {
  const report = evaluateCheckout();

assert.equal(report.integrityPassed, true);
  assertBlocked(report);
});
</CodeBlock>
