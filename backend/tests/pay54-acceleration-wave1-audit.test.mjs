"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateWave1Manifest,auditWave1} from "../governance/pay54-acceleration-wave1-audit.mjs";
const original=JSON.parse(readFileSync(new URL("../governance/pay54-acceleration-wave1.json",import.meta.url),"utf8"));
const clone=()=>structuredClone(original);
const success=stdout=>({success:true,stdout});
test("pins cumulative stack and independent workstreams",()=>{
 const m=validateWave1Manifest(clone());
 assert.deepEqual(m.stack.map(x=>x.pr),[92,93,94,95,96,97]);
 assert.equal(m.parallelStreams.length,6);
});
test("release gates are closed even on valid evidence",()=>{
 for(const key of Object.keys(original.release)){
  const m=clone();m.release[key]=true;
  assert.throws(()=>validateWave1Manifest(m),/RELEASE_GATE/);
 }
});
test("rejects changed SHA, duplicate branch and incomplete streams",()=>{
 let m=clone();m.stack[1].sha="invalid";
 assert.throws(()=>validateWave1Manifest(m),/STACK_IDENTITY/);
 m=clone();m.stack[1].branch=m.stack[0].branch;
 assert.throws(()=>validateWave1Manifest(m),/STACK_IDENTITY/);
 m=clone();m.parallelStreams.pop();
 assert.throws(()=>validateWave1Manifest(m),/STREAM_ASSIGNMENT/);
});
test("exact ancestry and immutable closed release report",()=>{
 const m=clone();const last=m.stack.at(-1).sha;
 let prior=m.protectedBase;
 const responses=[success(prior)];
 for(const entry of m.stack){responses.push(success(entry.sha));responses.push(success(""));prior=entry.sha;}
 responses.push(success(last));responses.push(success(""));
 let i=0;
 const result=auditWave1(m,()=>responses[i++]);
 assert.equal(result.sourceIntegrityValid,true);
 assert.equal(result.integrationReleaseApproved,false);
 assert.equal(result.customerMoneyEnabled,false);
 assert.equal(result.stagingApproved,false);
});
test("stale branch ref is an explicit blocker",()=>{
 const m=clone();const responses=[success(m.protectedBase)];
 for(const entry of m.stack){responses.push(success(entry.pr===94?"0".repeat(40):entry.sha));responses.push(success(""));}
 responses.push(success(m.stack.at(-1).sha));responses.push(success(""));
 let i=0;const result=auditWave1(m,()=>responses[i++]);
 assert.equal(result.sourceIntegrityValid,false);
 assert.ok(result.blockers.includes("PR_94_HEAD_DRIFT"));
});
