"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54PublicArtifactFileNames as inspect}
 from "../governance/pay54-batch27-pages-private-file-denial.mjs";
test("1143: private source, SQL and sourcemaps block static manifest",()=>{
 const r=inspect({paths:["index.html","backend/src/server.mjs",
  "assets/js/app.js.map","infrastructure/staging/main.tf"]});
 assert.equal(r.artifactManifestEligibleForReview,false);
 assert.equal(r.remotePagesArtifactNotInspected,true);
 assert.ok(r.blockedFiles.length>=3);
});
test("1143: independently reviewed static filenames may be considered, never published",()=>{
 const r=inspect({paths:["index.html","assets/css/site.css",
  "assets/js/app.js"]});
 assert.equal(r.artifactManifestEligibleForReview,true);
 assert.equal(r.productionPublicationAuthorised,false);
 assert.throws(()=>inspect({paths:["../private"]}),
 /PAGES_PRIVATE_FILE_DENIAL/);
});
