"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateManifest} from "../governance/pay54-batch50-integration-audit.mjs";
const manifest=JSON.parse(readFileSync(
 new URL("../governance/pay54-batch50-manifest.json",import.meta.url),"utf8"));
const copy=()=>structuredClone(manifest);
test("all nine exact PRs and baseline recorded",()=>{
 const x=validateManifest(copy());
 assert.deepEqual(x.pullRequests.map(p=>p.number),[81,82,83,84,85,86,87,88,89]);
});
test("all dangerous release gates remain false",()=>{
 for(const key of Object.keys(manifest.releaseGates)){
  assert.equal(manifest.releaseGates[key],false);
  const x=copy();x.releaseGates[key]=true;
  assert.throws(()=>validateManifest(x),/INVALID_OR_UNSAFE_MANIFEST/);
 }
});
test("rejects duplicates, misordered PRs and unknown SHAs",()=>{
 for(const mutation of [
  x=>{x.pullRequests[0].sha="bad";},
  x=>{x.pullRequests[1].branch=x.pullRequests[0].branch;},
  x=>{x.pullRequests.reverse();},
  x=>{x.pullRequests.pop();}
 ]){
  const x=copy();mutation(x);
  assert.throws(()=>validateManifest(x),/PAY54_BATCH50_/);
 }
});
test("unknown baseline and missing release gate are rejected",()=>{
 const x=copy();x.baseline.sha="invalid";
 assert.throws(()=>validateManifest(x),/INVALID_OR_UNSAFE_MANIFEST/);
 const y=copy();delete y.releaseGates.productionAuthorized;
 assert.throws(()=>validateManifest(y),/INVALID_OR_UNSAFE_MANIFEST/);
});
