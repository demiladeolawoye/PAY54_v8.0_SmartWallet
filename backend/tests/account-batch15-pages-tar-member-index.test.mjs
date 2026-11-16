"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54PagesTarMembers}
 from "../governance/pay54-pages-tar-member-index.mjs";

const BLOCK=512;
function header(path,data,{type="0"}={}){
 const h=Buffer.alloc(BLOCK,0);
 h.write(path,0,Math.min(path.length,100),"utf8");
 h.write("0000644\0",100,"ascii");
 h.write("0000000\0",108,"ascii");
 h.write("0000000\0",116,"ascii");
 h.write(data.length.toString(8).padStart(11,"0")+"\0",124,"ascii");
 h.fill(32,148,156);
 h.write(type,156,"ascii");
 h.write("ustar\0",257,"ascii");
 h.write("00",263,"ascii");
 let sum=0;
 for(const n of h)sum+=n;
 h.write(sum.toString(8).padStart(6,"0")+"\0 ",148,"ascii");
 return h;
}
function tar(files){
 const chunks=[];
 for(const entry of files){
  const data=Buffer.from(entry.body??"");
  chunks.push(header(entry.path,data,{type:entry.type??"0"}),data);
  const padding=(BLOCK-data.length%BLOCK)%BLOCK;
  if(padding)chunks.push(Buffer.alloc(padding));
 }
 chunks.push(Buffer.alloc(BLOCK*2));
 return Buffer.concat(chunks);
}
test("483: restricted tar metadata passes without examining content or authorising Pages",()=>{
 const report=inspectPay54PagesTarMembers(tar([
  {path:"./index.html",body:"<!doctype html>"},
  {path:"./assets/js/app.js",body:"export const active=false;"}
 ]));
 assert.equal(report.archiveSourceBoundaryPassed,true);
 assert.equal(report.regularFiles,2);
 assert.equal(report.fileContentsExamined,false);
 assert.equal(report.livePagesReachabilityConfirmed,false);
 assert.equal(report.productionRelease,"BLOCKED");
});
test("483: backend, docs and infrastructure roots prove overbroad artifact packaging",()=>{
 const report=inspectPay54PagesTarMembers(tar([
  {path:"./index.html",body:"home"},
  {path:"./backend/security/check.mjs",body:"synthetic"},
  {path:"./docs/private.md",body:"synthetic"},
  {path:"./infrastructure/main.tf",body:"synthetic"}
 ]));
 assert.equal(report.archiveSourceBoundaryPassed,false);
 assert.deepEqual(report.blockedRoots.map(x=>x.root),["backend","docs","infrastructure"]);
 assert.equal(report.regularFiles,4);
});
test("483: traversal and symlink entries never pass source review",()=>{
 const report=inspectPay54PagesTarMembers(tar([
  {path:"./index.html",body:"home"},
  {path:"../outside.js",body:"bad"},
  {path:"./assets/link.js",type:"2",body:""}
 ]));
 assert.equal(report.archiveSourceBoundaryPassed,false);
 assert.ok(report.findings.includes("UNSAFE_TAR_MEMBER_PATH"));
 assert.ok(report.findings.includes("UNSUPPORTED_TAR_MEMBER_TYPE"));
});
test("483: checksum corruption and truncated archive are rejected",()=>{
 const bytes=tar([{path:"./index.html",body:"home"}]);
 const bad=Buffer.from(bytes);
 bad[15]^=1;
 assert.throws(()=>inspectPay54PagesTarMembers(bad),/CHECKSUM_MISMATCH/);
 assert.throws(()=>inspectPay54PagesTarMembers(bytes.subarray(0,512)),/SIZE_OR_TYPE_DENIED/);
});
test("483: missing index prevents treating tar as a complete static site",()=>{
 const report=inspectPay54PagesTarMembers(tar([{path:"assets/js/app.js",body:"export {}"}]));
 assert.equal(report.archiveSourceBoundaryPassed,false);
});

test("496: duplicate tar entries remain unsafe even when path is allowlisted",()=>{
 const report=inspectPay54PagesTarMembers(tar([
  {path:"index.html",body:"first"},
  {path:"index.html",body:"second"}
 ]));
 assert.equal(report.archiveSourceBoundaryPassed,false);
 assert.ok(report.findings.includes("DUPLICATE_TAR_MEMBER"));
});
test("496: an archive without the two terminating zero blocks fails closed",()=>{
 const valid=tar([{path:"index.html",body:"home"}]);
 const truncated=valid.subarray(0,valid.length-512);
 assert.throws(()=>inspectPay54PagesTarMembers(truncated),/TERMINATOR_MISSING/);
});
test("496: malformed tar size fields are not interpreted as safe numbers",()=>{
 const valid=tar([{path:"index.html",body:"home"}]);
 const modified=Buffer.from(valid);
 modified.fill(0,124,136);
 modified.write("not-a-number",124,"ascii");
 modified.fill(32,148,156);
 let checksum=0;
 for(const byte of modified.subarray(0,BLOCK))checksum+=byte;
 modified.write(checksum.toString(8).padStart(6,"0")+"\0 ",148,"ascii");
 assert.throws(()=>inspectPay54PagesTarMembers(modified),/INVALID_OCTAL_FIELD/);
});
