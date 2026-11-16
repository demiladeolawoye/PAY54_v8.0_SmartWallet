"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54PagesReleasePreflight}
 from "../governance/pay54-pages-release-preflight.mjs";
import {auditPay54LinkedCardReleaseDependency}
 from "../governance/pay54-linked-card-publication-dependency.mjs";

test("608: actual PAY54 candidate cannot silently publish development provider",()=>{
 const release=assessPay54PagesReleasePreflight();
 const provider=auditPay54LinkedCardReleaseDependency();
 assert.equal(release.productionRelease,"BLOCKED");
 assert.equal(provider.productionRelease,"BLOCKED");
 assert.equal(release.sourceReviewPassed,false);
 assert.ok(release.blockers.includes("SITE_DEPENDENCY_GRAPH_INCOMPLETE"));
 assert.ok(release.blockers.includes("DEVELOPMENT_PROVIDER_IN_FORBIDDEN_PUBLICATION_PATH"));
 assert.ok(provider.issues.includes("DEVELOPMENT_CARD_PROVIDER_REFERENCED"));
 assert.ok(provider.issues.includes("PROVIDER_EXCLUDED_BY_PUBLICATION_POLICY"));
 assert.equal(provider.productionProviderContractVerified,false);
 assert.equal(provider.currentCustomerFunctionalityChanged,false);
});
test("608: report of unsafe source does not imply access to live Pages settings",()=>{
 const release=assessPay54PagesReleasePreflight();
 assert.equal(release.livePagesConfigVerified,false);
 assert.equal(release.activeDeploymentArtifactVerified,false);
 assert.equal(release.settingsChanged,false);
 assert.equal(release.deployed,false);
 assert.equal(release.releaseAuthorised,false);
});
