"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54GithubRulesets as inspect}
 from "../governance/pay54-batch27-ruleset-api-review.mjs";
test("1151: zero visible rulesets is not proof of absent branch protection",()=>{
 const r=inspect({rulesets:[]});
 assert.equal(r.observedRulesetCount,0);
 assert.equal(r.emptyListDoesNotProveMissingProtection,true);
 assert.equal(r.deploymentAuthorised,false);
});
test("1151: active branch ruleset still requires effective conditions and bypass review",()=>{
 const r=inspect({rulesets:[{id:123,enforcement:"active",
  target:"branch",name:"protect-staging"}]});
 assert.equal(r.activeBranchRulesetCount,1);
 assert.equal(r.adminBypassAndRepoHierarchyInspected,false);
 assert.throws(()=>inspect({rulesets:[{id:12,enforcement:"invalid",
  target:"branch",name:"fake"}]}),/GITHUB_RULESET_REVIEW_DENIED/);
});
