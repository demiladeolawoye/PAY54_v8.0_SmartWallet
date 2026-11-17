"use strict";

/**
 * PAY54 Batch 23 / 909 — least-privilege GitHub release policy assessment.
 *
 * Consumes read-only GitHub ruleset metadata. Current branch protections,
 * Actions environment restrictions, cloud OIDC and actual IAM are separate
 * controls; this source check NEVER grants deployment authority.
 */
const REPO = "demiladeolawoye/PAY54_v8.0_SmartWallet";
const deny = () => { throw new Error("PAY54_DEPLOYER_POLICY_INVALID"); };
const TYPES = new Set(["required_status_checks", "pull_request"]);

export function assessPay54DeployerGovernance({
  repositoryFullName,
  rulesets
} = {}) {
  if (repositoryFullName !== REPO ||
      !Array.isArray(rulesets) || rulesets.length > 500) deny();

  let protectedDefaultBranch = false;
  let checkedRules = 0;
  for (const rule of rulesets) {
    if (!rule || typeof rule !== "object") deny();
    if (rule.enforcement !== "active" || rule.target !== "branch") continue;
    const includes = rule.conditions?.ref_name?.include;
    const kinds = rule.rules?.map(r => r.type);
    if (!Array.isArray(includes) || !Array.isArray(kinds)) continue;
    const defaultProtected = includes.includes("~DEFAULT_BRANCH");
    const hasChecks = TYPES.size ===
      new Set(kinds.filter(kind => TYPES.has(kind))).size;
    // Check both mandatory families, without treating arbitrary rules as proof.
    if (defaultProtected && hasChecks) {
      protectedDefaultBranch = true;
      checkedRules++;
    }
  }

  return Object.freeze({
    schema: "pay54.github-deployer-governance.v1",
    repositoryFullName,
    githubRulesetsInspected: rulesets.length,
    qualifyingActiveDefaultBranchRulesets: checkedRules,
    sourceMetadataIndicatesProtectedDefault: protectedDefaultBranch,
    mustIndependentlyVerifyBranchProtection: true,
    mustVerifyEnvironmentReviewersAndOidc: true,
    mustVerifyDeployerCloudIamAndRollback: true,
    pagesExposureInvestigationComplete: false,
    productionDeploymentAuthorised: false
  });
}
