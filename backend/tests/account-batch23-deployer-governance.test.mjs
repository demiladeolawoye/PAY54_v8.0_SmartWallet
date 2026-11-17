"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { assessPay54DeployerGovernance as assess }
  from "../governance/pay54-batch23-deployer-governance.mjs";

const repo = "demiladeolawoye/PAY54_v8.0_SmartWallet";
const activeRule = {
  name: "mandatory-protection", enforcement: "active", target: "branch",
  conditions: { ref_name: { include: ["~DEFAULT_BRANCH"] } },
  rules: [{ type: "required_status_checks" }, { type: "pull_request" }]
};

test("910: empty GitHub rulesets require protected branch and OIDC remediation", () => {
  const result = assess({ repositoryFullName: repo, rulesets: [] });
  assert.equal(result.githubRulesetsInspected, 0);
  assert.equal(result.sourceMetadataIndicatesProtectedDefault, false);
  assert.equal(result.mustVerifyEnvironmentReviewersAndOidc, true);
  assert.equal(result.productionDeploymentAuthorised, false);
});

test("910: ruleset metadata can qualify for manual review but never approve release", () => {
  const result = assess({ repositoryFullName: repo, rulesets: [activeRule] });
  assert.equal(result.sourceMetadataIndicatesProtectedDefault, true);
  assert.equal(result.qualifyingActiveDefaultBranchRulesets, 1);
  assert.equal(result.mustIndependentlyVerifyBranchProtection, true);
  assert.equal(result.productionDeploymentAuthorised, false);
  assert.ok(Object.isFrozen(result));
});

test("910: disabled or non-default protections cannot impersonate active coverage", () => {
  for (const variant of [
    { enforcement: "disabled" },
    { target: "tag" },
    { rules: [{ type: "pull_request" }] },
    { conditions: { ref_name: { include: ["refs/heads/feature"] } } }
  ]) {
    const result = assess({ repositoryFullName: repo,
      rulesets: [{ ...activeRule, ...variant }] });
    assert.equal(result.sourceMetadataIndicatesProtectedDefault, false);
  }
  assert.throws(() => assess({ repositoryFullName: "not-pay54", rulesets: [] }),
    /DEPLOYER_POLICY_INVALID/);
});
