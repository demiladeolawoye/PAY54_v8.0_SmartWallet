"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {verifyPay54PagesTarAgainstSource}
 from "../governance/pay54-batch18-pages-tar-attestation.mjs";
const BLOCK=512,sha=bytes=>createHash("sha256").update(bytes).digest("hex");
function tarFile(path,data){
 const payload=Buffer.from(data);
 const head=Buffer.alloc(BLOCK);
 head.write(path,0,"utf8");
 head.write("0000644\0",100,"ascii");
 head.write("0000000\0",108,"ascii");
 head.write("0000000\0",116,"ascii");
 head.write(payload.length.toString(8).padStart(11,"0")+"\0",124,"ascii");
 head.fill(32,148,156);
 head.write("0",156,"ascii");
 let sum=0;for(const b of head)sum+=b;
 head.write(sum.toString(8).padStart(6,"0")+"\0 ",148,"ascii");
 return Buffer.concat([head,payload,Buffer.alloc((BLOCK-payload.length%BLOCK)%BLOCK)]);
}
const archive=(...files)=>Buffer.concat([...files,Buffer.alloc(BLOCK*2)]);
const expected=(path,data)=>({path,bytes:Buffer.byteLength(data),sha256:sha(Buffer.from(data))});
test("634: exact file bytes in a restricted tar match the manifest without release authority",()=>{
 const data="<!doctype html><h1>PAY54 Preview</h1>";
 const result=verifyPay54PagesTarAgainstSource(
  archive(tarFile("index.html",data)),{files:[expected("index.html",data)]}
 );
 assert.equal(result.exactSourceBytesMatched,true);
 assert.equal(result.actualFiles,1);
 assert.equal(result.archiveOriginAuthenticated,false);
 assert.equal(result.currentlyDeployedArtifactVerified,false);
 assert.equal(result.productionRelease,"BLOCKED");
});
test("634: extra backend member is refused even with valid checksums",()=>{
 const data="<h1>PAY54</h1>";
 const tar=archive(tarFile("index.html",data),tarFile("backend/source.js","internal"));
 const r=verifyPay54PagesTarAgainstSource(tar,{files:[expected("index.html",data)]});
 assert.equal(r.exactSourceBytesMatched,false);
 assert.ok(r.mismatches.includes("UNEXPECTED_MEMBER"));
});
test("634: changed bytes, duplicates and missing paths fail closed",()=>{
 const a=expected("index.html","safe");
 const wrong=verifyPay54PagesTarAgainstSource(
  archive(tarFile("index.html","unsafe")),{files:[a]}
 );
 assert.ok(wrong.mismatches.includes("FILE_DIGEST_MISMATCH"));
 const duplicate=verifyPay54PagesTarAgainstSource(
  archive(tarFile("index.html","safe"),tarFile("index.html","safe")),{files:[a]}
 );
 assert.ok(duplicate.mismatches.includes("DUPLICATE_MEMBER"));
 const missing=verifyPay54PagesTarAgainstSource(
  archive(tarFile("assets/css/site.css","x")),{files:[a]}
 );
 assert.ok(missing.mismatches.includes("EXPECTED_MEMBERS_MISSING"));
});
test("634: malformed checksums and unsafe manifest paths never become positive matches",()=>{
 const data=tarFile("index.html","safe");data[0]^=1;
 assert.throws(()=>verifyPay54PagesTarAgainstSource(
  archive(data),{files:[expected("index.html","safe")]}
 ),/CHECKSUM_MISMATCH/);
 assert.throws(()=>verifyPay54PagesTarAgainstSource(
  archive(tarFile("index.html","safe")),
  {files:[expected("backend/../index.html","safe")]}
 ),/EXPECTED_MEMBER_INVALID/);
});

test("641: an unexpected internal directory is not allowed even without file payloads",()=>{
 const data="PAY54 static";
 const directory=tarFile("backend/","");
 directory[156]=53;
 directory.fill(32,148,156);
 let sum=0;for(const byte of directory.subarray(0,BLOCK))sum+=byte;
 directory.write(sum.toString(8).padStart(6,"0")+"\0 ",148,"ascii");
 const r=verifyPay54PagesTarAgainstSource(
  archive(tarFile("index.html",data),directory),
  {files:[expected("index.html",data)]}
 );
 assert.equal(r.exactSourceBytesMatched,false);
 assert.ok(r.mismatches.includes("UNEXPECTED_DIRECTORY"));
});
test("641: nonzero trailing data after standard tar end blocks cannot be hidden",()=>{
 const data="PAY54 static";
 const tampered=Buffer.concat([
  archive(tarFile("index.html",data)),Buffer.alloc(BLOCK,1)
 ]);
 const r=verifyPay54PagesTarAgainstSource(tampered,{files:[expected("index.html",data)]});
 assert.equal(r.exactSourceBytesMatched,false);
 assert.ok(r.mismatches.includes("NONZERO_TRAILING_ARCHIVE_DATA"));
});
