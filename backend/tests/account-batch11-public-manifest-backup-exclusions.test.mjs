"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54PublicSiteManifest}
 from "../governance/pay54-public-site-manifest.mjs";

test("286: historical and backup scripts fail public artefact approval",()=>{
 const disallowed=[
  "assets/js/dashboard.backup.js",
  "assets/dashboard-lastworking-before scan and pay.js",
  "assets/js/engine/contacts/storage.old.js",
  "assets/js/engine/contacts/debug.js",
  "assets/js/temporary.css",
  "assets/js/staging/archive.json",
  "assets/js/app.js.map",
  "assets/js/config.orig"
 ];
 const result=assessPay54PublicSiteManifest({paths:disallowed});
 assert.equal(result.sourceManifestStructurallySafe,false);
 assert.deepEqual(result.disallowedPaths,disallowed.slice().sort());
 assert.equal(result.publicationApproved,false);
});
test("286: standard active static files remain structurally eligible only",()=>{
 const result=assessPay54PublicSiteManifest({paths:[
  "index.html","assets/js/dashboard-core.js",
  "assets/css/dashboard.css","assets/img/pay54-logo.svg"
 ]});
 assert.equal(result.sourceManifestStructurallySafe,true);
 assert.equal(result.actualPagesContentInspected,false);
 assert.equal(result.publicationApproved,false);
});
test("286: crafted backup extension and source-map variants still deny",()=>{
 const result=assessPay54PublicSiteManifest({paths:[
  "assets/js/old.dashboard.js",
  "assets/js/user-draft.js",
  "assets/js/app.js.bak",
  "assets/js/archive/test.js"
 ]});
 assert.equal(result.sourceManifestStructurallySafe,false);
 assert.equal(result.disallowedPaths.length,4);
});
