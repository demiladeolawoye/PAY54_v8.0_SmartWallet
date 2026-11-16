"use strict";

/**
 * PAY54 Batch 18 item 633 — byte-level offline Pages artifact attestation.
 *
 * Compares every regular tar member byte against a separately reviewed
 * restricted source-file SHA-256 manifest. It does NOT extract files,
 * communicate with GitHub, approve deployment or assert live reachability.
 * Unknown tar extensions, links, duplicate paths and extra members fail shut.
 */
import {createHash} from "node:crypto";

const BLOCK=512,MAX_BYTES=64*1024*1024,MAX_FILES=2000,MAX_ENTRY=5_000_000;
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");
const SHA=/^[a-f0-9]{64}$/;
const NAME=/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/;
const ascii=(bytes,start,n)=>bytes.subarray(start,start+n).toString("utf8").split("\0",1)[0];
function octal(bytes,start,length){
 const raw=ascii(bytes,start,length).trim();
 if(!/^[0-7]+$/.test(raw))throw new Error("PAY54_TAR_ATTEST_INVALID_OCTAL");
 const value=Number.parseInt(raw,8);
 if(!Number.isSafeInteger(value)||value<0)throw new Error("PAY54_TAR_ATTEST_INVALID_NUMBER");
 return value;
}
function headerChecksum(header){
 let sum=0;
 for(let i=0;i<BLOCK;i++)sum+=i>=148&&i<156?32:header[i];
 return sum;
}
export function verifyPay54PagesTarAgainstSource(tar,manifest){
 if(!Buffer.isBuffer(tar)||tar.length<2*BLOCK||tar.length>MAX_BYTES||
  tar.length%BLOCK!==0)throw new TypeError("PAY54_TAR_ATTEST_ARCHIVE_INVALID");
 const expected=manifest?.files;
 if(!Array.isArray(expected)||expected.length===0||expected.length>MAX_FILES){
  throw new TypeError("PAY54_TAR_ATTEST_MANIFEST_INVALID");
 }
 const byPath=new Map();
 for(const f of expected){
  if(typeof f?.path!=="string"||!NAME.test(f.path)||
   f.path.startsWith("/")||f.path.includes("//")||
   f.path.split("/").some(x=>x==="."||x===".."||x.startsWith("."))||
   !Number.isSafeInteger(f.bytes)||f.bytes<0||f.bytes>MAX_ENTRY||
   !SHA.test(f.sha256??"")||byPath.has(f.path)){
   throw new Error("PAY54_TAR_ATTEST_EXPECTED_MEMBER_INVALID");
  }
  byPath.set(f.path,f);
 }
 const failures=[],seen=new Set();
 let offset=0,zeros=0,actualFiles=0;
 while(offset+BLOCK<=tar.length){
  const header=tar.subarray(offset,offset+BLOCK);
  if(header.every(x=>x===0)){
   if(++zeros===2)break;
   offset+=BLOCK;continue;
  }
  zeros=0;
  if(headerChecksum(header)!==octal(header,148,8)){
   throw new Error("PAY54_TAR_ATTEST_CHECKSUM_MISMATCH");
  }
  const name=ascii(header,0,100),prefix=ascii(header,345,155);
  const raw=(prefix?prefix+"/":"")+name;
  const path=raw.replace(/^\.\//,"").replace(/\/$/,"");
  const type=header[156],size=octal(header,124,12);
  if(size>MAX_ENTRY)failures.push("OVERSIZE_MEMBER");
  if(type!==0&&type!==48&&type!==53)failures.push("UNSUPPORTED_MEMBER_TYPE");
  if(!NAME.test(path)||path.startsWith("/")||path.includes("//")||
   path.split("/").some(x=>x==="."||x===".."||x.startsWith("."))){
   failures.push("UNSAFE_MEMBER_PATH");
  }
  const aligned=Math.ceil(size/BLOCK)*BLOCK;
  if(offset+BLOCK+aligned>tar.length){
   throw new Error("PAY54_TAR_ATTEST_MEMBER_OVERRUN");
  }
  if(type===0||type===48){
   actualFiles++;
   if(actualFiles>MAX_FILES)throw new Error("PAY54_TAR_ATTEST_FILE_LIMIT");
   if(seen.has(path))failures.push("DUPLICATE_MEMBER");
   seen.add(path);
   const expectedFile=byPath.get(path);
   if(!expectedFile)failures.push("UNEXPECTED_MEMBER");
   else if(expectedFile.bytes!==size||
    expectedFile.sha256!==sha256(tar.subarray(offset+BLOCK,offset+BLOCK+size))){
    failures.push("FILE_DIGEST_MISMATCH");
   }
  }else if(size!==0)failures.push("DIRECTORY_WITH_CONTENT");
  offset+=BLOCK+aligned;
 }
 if(zeros!==2)throw new Error("PAY54_TAR_ATTEST_TERMINATOR_MISSING");
 const missing=[...byPath.keys()].filter(x=>!seen.has(x));
 if(missing.length)failures.push("EXPECTED_MEMBERS_MISSING");
 return Object.freeze({
  schema:"pay54.pages-tar-source-byte-attestation.v1",
  expectedFiles:byPath.size,
  actualFiles,
  mismatches:Object.freeze([...new Set(failures)]),
  missingFileCount:missing.length,
  exactSourceBytesMatched:failures.length===0,
  archiveOriginAuthenticated:false,
  currentlyDeployedArtifactVerified:false,
  publicReachabilityVerified:false,
  deploymentApproved:false,
  productionRelease:"BLOCKED"
 });
}
