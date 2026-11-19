"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { assessPay54RepositoryRootPublication as assess,
  assessPay54TrackedRepositoryRoot as inspectGit }
 from "../governance/pay54-batch25-publication-risk.mjs";

test("969: source root containing backend and migration SQL is blocked for Pages",()=>{
 const r=assess({trackedPaths:[
  "index.html","dashboard.html","assets/js/dashboard-core.js",
  "backend/src/server.mjs","backend/db/migrations/020_initial_account_binding.sql",
  "infrastructure/staging/main.tf","docs/engineering/private.md",
  ".github/workflows/deploy.yml"
 ]});
 assert.equal(r.sourceRootEligibleForPages,false);
 assert.equal(r.sourceRootPublicationBlocked,true);
 assert.equal(r.activePagesSourceVerified,false);
 assert.equal(r.remotePublishedArtifactInspected,false);
 assert.ok(r.sensitiveFileCount>=4);
 assert.equal(r.deploymentAuthorised,false);
});
test("969: a separately packaged inert static-only tree passes source classification",()=>{
 const r=assess({trackedPaths:[
  "index.html","dashboard.html","assets/css/dashboard.css",
  "assets/js/dashboard-core.js","assets/img/logo.svg"
 ]});
 assert.equal(r.sourceRootEligibleForPages,true);
 assert.equal(r.deploymentAuthorised,false);
 assert.equal(r.remotePublishedArtifactInspected,false);
});
test("969: traversals, duplicates and malformed root manifest fail",()=>{
 for(const trackedPaths of [
  [],["../secret.pem"],["index.html","index.html"],
  ["assets\\private.js"],["/etc/hosts"],["foo//bar"]
 ])assert.throws(()=>assess({trackedPaths}),
   /SOURCE_PUBLICATION_AUDIT_DENIED/);
});
test("969: actual checked-out repository is never classified as safe Pages root",()=>{
 const r=inspectGit();
 assert.equal(r.sourceRootPublicationBlocked,true);
 assert.equal(r.previousBoundaryAuditDetected,true);
 assert.ok(r.trackedFileCount>100);
 assert.equal(r.activePagesSourceVerified,false);
});
