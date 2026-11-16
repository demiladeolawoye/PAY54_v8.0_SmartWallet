"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54PublicSiteManifest} from "../governance/pay54-public-site-manifest.mjs";

test("279: ordinary intended static web files can be assessed without release approval",()=>{
 const report=assessPay54PublicSiteManifest({
  paths:["index.html","assets/css/dashboard.css","assets/js/dashboard.js",
   "assets/images/logo.svg","manifest.webmanifest"]
 });
 assert.equal(report.sourceManifestStructurallySafe,true);
 assert.deepEqual(report.disallowedPaths,[]);
 assert.equal(report.actualPagesContentInspected,false);
 assert.equal(report.secretsScanPerformed,false);
 assert.equal(report.publicationApproved,false);
 assert.equal(report.productionRelease,"BLOCKED");
});
test("279: source and secret files cannot enter a proposed site manifest",()=>{
 const unsafe=[
  ".github/workflows/deploy.yml","backend/src/config.mjs",
  "docs/security/credentials.txt","secrets/tenant.json",
  "assets/../../../.env","assets/js/bundle.js.map",
  "uploads/customer.sql","private/keys.pem",
  "assets/js/client.key","node_modules/internal.js",
  "assets/config/.env.production","tests/fixtures.json",
  "assets//index.html","/index.html","assets/../index.html"
 ];
 const report=assessPay54PublicSiteManifest({paths:unsafe});
 assert.equal(report.sourceManifestStructurallySafe,false);
 assert.equal(report.disallowedPaths.length,unsafe.length);
 assert.equal(report.publicationApproved,false);
});
test("279: duplicates, malformed manifests and folder-only entries deny",()=>{
 assert.throws(()=>assessPay54PublicSiteManifest({paths:[]}),
  /PAY54_PUBLIC_MANIFEST_INVALID/);
 assert.throws(()=>assessPay54PublicSiteManifest({paths:"index.html"}),
  /PAY54_PUBLIC_MANIFEST_INVALID/);
 const duplicates=assessPay54PublicSiteManifest({
  paths:["index.html","index.html"]
 });
 assert.equal(duplicates.duplicatePaths,true);
 assert.equal(duplicates.sourceManifestStructurallySafe,false);
 assert.equal(assessPay54PublicSiteManifest({
  paths:["assets/"]
 }).sourceManifestStructurallySafe,false);
});
