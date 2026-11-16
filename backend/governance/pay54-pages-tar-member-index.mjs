"use strict";

/**
 * PAY54 item 482 — bounded, read-only tar member metadata inspection.
 *
 * Intended for the inner artifact.tar from a retrieved GitHub Pages artifact.
 * It NEVER extracts file contents or automatically fetches remote archives.
 * Unknown tar extensions, checksums or link types fail closed.
 */
const BLOCKED_ROOTS=new Set([
 "backend","docs","infrastructure",".github",".git","node_modules",
 "terraform","private","secrets","tests","coverage"
]);
const MAX_BYTES=64*1024*1024;
const MAX_ENTRIES=5000;
const BLOCK_SIZE=512;
const ascii=(bytes,start,length)=>bytes.subarray(start,start+length).toString("utf8").split("\0",1)[0];
function octal(bytes,start,length){
 const text=ascii(bytes,start,length).trim();
 if(!/^[0-7]+$/.test(text))throw new Error("PAY54_TAR_INVALID_OCTAL_FIELD");
 const value=Number.parseInt(text,8);
 if(!Number.isSafeInteger(value)||value<0)throw new Error("PAY54_TAR_UNSAFE_NUMERIC_FIELD");
 return value;
}
function checksum(block){
 let sum=0;
 for(let i=0;i<BLOCK_SIZE;i++){
  sum+=i>=148&&i<156?32:block[i];
 }
 return sum;
}
export function inspectPay54PagesTarMembers(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.byteLength>MAX_BYTES||
  bytes.byteLength<2*BLOCK_SIZE||
  bytes.byteLength%BLOCK_SIZE!==0){
  throw new TypeError("PAY54_TAR_ARCHIVE_SIZE_OR_TYPE_DENIED");
 }
 const blockedCounts=new Map();
 const categories=new Map();
 const findings=[];
 const present=new Set();
 let offset=0,fileCount=0,directoryCount=0,zeroBlocks=0,entries=0;
 while(offset+BLOCK_SIZE<=bytes.byteLength){
  const block=bytes.subarray(offset,offset+BLOCK_SIZE);
  if(block.every(x=>x===0)){
   zeroBlocks++;offset+=BLOCK_SIZE;
   if(zeroBlocks===2)break;
   continue;
  }
  zeroBlocks=0;
  if(++entries>MAX_ENTRIES)throw new Error("PAY54_TAR_ENTRY_LIMIT");
  const expected=octal(block,148,8);
  if(expected!==checksum(block))throw new Error("PAY54_TAR_CHECKSUM_MISMATCH");
  const name=ascii(block,0,100);
  const prefix=ascii(block,345,155);
  const rawPath=(prefix?prefix+"/":"")+name;
  const type=block[156];
  const size=octal(block,124,12);
  const path=rawPath.replace(/^\.\//,"").replace(/\/$/,"");
  if(!path||path==="."||path.startsWith("/")||
   path.includes("\\")||path.split("/").some(x=>x===".."||x==="")||
   path.includes("\0")){
   findings.push("UNSAFE_TAR_MEMBER_PATH");
  }else{
   if(present.has(path))findings.push("DUPLICATE_TAR_MEMBER");
   present.add(path);
   const root=path.split("/",1)[0].toLowerCase();
   categories.set(root,(categories.get(root)??0)+1);
   if(BLOCKED_ROOTS.has(root)){
    blockedCounts.set(root,(blockedCounts.get(root)??0)+1);
   }
  }
  if(type===48||type===0){
   fileCount++;
   if(size>5_000_000)findings.push("OVERSIZE_TAR_MEMBER");
  }else if(type===53){
   directoryCount++;
   if(size!==0)findings.push("NONEMPTY_DIRECTORY_MEMBER");
  }else findings.push("UNSUPPORTED_TAR_MEMBER_TYPE");
  const aligned=Math.ceil(size/BLOCK_SIZE)*BLOCK_SIZE;
  if(size>MAX_BYTES||offset+BLOCK_SIZE+aligned>bytes.byteLength){
   throw new Error("PAY54_TAR_MEMBER_OVERRUN");
  }
  offset+=BLOCK_SIZE+aligned;
 }
 if(zeroBlocks!==2)throw new Error("PAY54_TAR_TERMINATOR_MISSING");
 const blockingRoots=Object.freeze([...blockedCounts].sort((a,b)=>
  a[0].localeCompare(b[0])).map(([root,count])=>Object.freeze({root,count})));
 const rootCounts=Object.freeze([...categories].sort((a,b)=>
  a[0].localeCompare(b[0])).map(([root,count])=>Object.freeze({root,count})));
 return Object.freeze({
  schema:"pay54.pages-tar-member-index.v1",
  tarEntries:entries,
  regularFiles:fileCount,
  directories:directoryCount,
  blockedRoots:blockingRoots,
  rootCounts,
  findings:Object.freeze(findings),
  archiveSourceBoundaryPassed:blockingRoots.length===0&&findings.length===0&&
   present.has("index.html"),
  fileContentsExamined:false,
  livePagesReachabilityConfirmed:false,
  productionRelease:"BLOCKED"
 });
}
