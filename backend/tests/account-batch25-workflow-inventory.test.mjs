"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54ReleaseWorkflowSources as assess,
 assessPay54TrackedReleaseWorkflowSources as real}
 from "../governance/pay54-batch25-workflow-inventory.mjs";

test("980: deployment-capable workflow signals require human review",()=>{
 const result=assess({sources:{
  "release.yml":`name: release
permissions:
  contents: write
  pages: write
  id-token: write
jobs:
  deploy:
    steps:
      - uses: actions/deploy-pages@v4
      - uses: google-github-actions/auth@v2
`,
  "read-only.yml":`name: review
permissions:
  contents: read
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - run: node --test tests
`
 }});
 assert.equal(result.workflowCount,2);
 assert.equal(result.potentialDeploymentWorkflowCount,1);
 const release=result.observations.find(x=>x.workflow==="release.yml");
 assert.ok(release.potentialDeploymentSignals.includes("pagesWrite"));
 assert.ok(release.potentialDeploymentSignals.includes("cloudAuth"));
 assert.equal(result.branchProtectionVerified,false);
 assert.equal(result.pagesSettingsVerified,false);
 assert.equal(result.productionReleaseAuthorised,false);
});
test("980: actual repository has workflows but inventory cannot claim deployment controls",()=>{
 const result=real();
 assert.ok(result.workflowCount>10);
 assert.equal(result.pagesSettingsVerified,false);
 assert.equal(result.effectiveGithubTokenPermissionsVerified,false);
 assert.equal(result.productionReleaseAuthorised,false);
});
test("980: no arbitrary filenames or injection through workflow metadata",()=>{
 assert.throws(()=>assess({sources:{"../evil.yml":"name: malicious"}}),
  /RELEASE_WORKFLOW_AUDIT_DENIED/);
 assert.throws(()=>assess({sources:{}}),/RELEASE_WORKFLOW_AUDIT_DENIED/);
});
