"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {verifyPay54PagesArtifactProvenance as verify}
 from "../governance/pay54-batch26-artifact-provenance.mjs";
const sha="a".repeat(40),bytes=Buffer.from("<html>PAY54</html>");
const digest=createHash("sha256").update(bytes).digest("hex");
const input={expectedCommitSha:sha,
 manifest:{sourceCommitSha:sha,files:[{path:"index.html",sha256:digest}]},
 observedFiles:{"index.html":bytes}};
test("1021: compared candidate bytes remain unauthenticated live evidence",()=>{
 const r=verify(input);
 assert.equal(r.matchedFileCount,1);
 assert.equal(r.livePagesBytesVerified,false);
 assert.equal(r.deploymentAuthorised,false);
});
test("1021: mismatched hash, wrong commit, missing asset and path traversal fail closed",()=>{
 for(const v of [
  {expectedCommitSha:"b".repeat(40)},
  {manifest:{sourceCommitSha:sha,files:[{path:"index.html",sha256:"f".repeat(64)}]}},
  {observedFiles:{}},
  {manifest:{sourceCommitSha:sha,files:[{path:"../index.html",sha256:digest}]}},
  {manifest:{sourceCommitSha:sha,files:[{path:"index.html",sha256:digest},
   {path:"index.html",sha256:digest}]}}
 ])assert.throws(()=>verify({...input,...v}),
 /PAGES_ARTIFACT_PROVENANCE_DENIED/);
});
