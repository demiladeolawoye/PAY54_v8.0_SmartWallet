"use strict";

/**
 * PAY54 implementation 468 — publication tree security inventory.
 *
 * This is an offline, read-only inspection of a locally staged directory.
 * It never touches live Pages settings, production artifacts or customers.
 *
 * Security constraints:
 * - refuse symbolic links, special files, nested traversal and unsafe names;
 * - refuse backend, infrastructure, source-map, credential and backup paths;
 * - guard against case-folding path collisions on different deployment hosts;
 * - bound directory depth, file count, individual size and total bytes;
 * - record only safe relative filenames and SHA-256 fingerprints.
 */
import {createHash} from "node:crypto";
import {readdirSync, lstatSync, readFileSync} from "node:fs";
import {basename, extname, isAbsolute, join, relative, resolve, sep} from "node:path";

const MAX_DEPTH=12;
const MAX_FILES=2000;
const MAX_TOTAL_BYTES=40_000_000;
const MAX_FILE_BYTES=5_000_000;
const EXTENSIONS=new Set([
 ".html",".css",".js",".mjs",".json",".svg",".png",".webp",
 ".jpg",".jpeg",".gif",".ico",".woff",".woff2",".ttf",
 ".txt",".xml",".webmanifest",".avif",".wasm"
]);
const FORBIDDEN_PARTS=new Set([
 ".git",".github","backend","infra","infrastructure","terraform",
 "node_modules","test","tests","fixtures","secrets","private",
 "internal","coverage","vendor-private",".well-known-private"
]);
const FORBIDDEN_NAMES=/(?:^|[._-])(?:secret|credential|password|token|backup|private.key|id_rsa|service.account)(?:[._-]|$)/i;
const ENDS_WITH_FORBIDDEN=/(?:\.map|\.bak|\.old|\.orig|\.swp|\.pem|\.key|\.p12|\.pfx|\.env(?:\..*)?|\.log|\.zip|\.tar|\.gz|\.sql|\.sqlite(?:3)?|\.db)$/i;
const SEGMENT=/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const SHA256=data=>createHash("sha256").update(data).digest("hex");

export function inspectPay54PublicationTree(rootPath){
 if(typeof rootPath!=="string"||!rootPath.trim()){
  throw new TypeError("PAY54_PUBLICATION_ROOT_REQUIRED");
 }
 const root=resolve(rootPath);
 const rootInfo=lstatSync(root);
 if(!rootInfo.isDirectory()||rootInfo.isSymbolicLink()){
  throw new Error("PAY54_PUBLICATION_ROOT_NOT_PLAIN_DIRECTORY");
 }
 const findings=[],files=[];
 const seenCaseInsensitive=new Map();
 let totalBytes=0;
 function scan(directory,segments){
  if(segments.length>MAX_DEPTH){
   throw new Error("PAY54_PUBLICATION_TREE_DEPTH_LIMIT");
  }
  const entries=readdirSync(directory,{withFileTypes:true})
   .sort((a,b)=>a.name.localeCompare(b.name,"en"));
  for(const entry of entries){
   const name=entry.name;
   const parts=[...segments,name];
   const path=parts.join("/");
   if(!SEGMENT.test(name)||name==="."||name===".."||
    name.startsWith(".")||name.endsWith(".")){
    findings.push(Object.freeze({path,reason:"UNSAFE_NAME"}));
    continue;
   }
   const absolute=join(directory,name);
   const stat=lstatSync(absolute);
   if(stat.isSymbolicLink()||(!stat.isDirectory()&&!stat.isFile())){
    findings.push(Object.freeze({path,reason:"UNSAFE_FILE_TYPE"}));
    continue;
   }
   const lower=path.toLowerCase();
   const previous=seenCaseInsensitive.get(lower);
   if(previous&&previous!==path){
    findings.push(Object.freeze({path,reason:"CASE_COLLISION"}));
   }else seenCaseInsensitive.set(lower,path);
   if(FORBIDDEN_PARTS.has(name.toLowerCase())||FORBIDDEN_NAMES.test(name)||
    ENDS_WITH_FORBIDDEN.test(name)){
    findings.push(Object.freeze({path,reason:"INTERNAL_OR_SENSITIVE_PATH"}));
    continue;
   }
   if(stat.isDirectory()){
    scan(absolute,parts);
    continue;
   }
   if(!EXTENSIONS.has(extname(name).toLowerCase())){
    findings.push(Object.freeze({path,reason:"UNAPPROVED_FILE_EXTENSION"}));
    continue;
   }
   if(stat.size>MAX_FILE_BYTES){
    findings.push(Object.freeze({path,reason:"OVERSIZE_FILE"}));
    continue;
   }
   if(files.length>=MAX_FILES||totalBytes+stat.size>MAX_TOTAL_BYTES){
    throw new Error("PAY54_PUBLICATION_TREE_BUDGET_EXCEEDED");
   }
   const content=readFileSync(absolute);
   const current=lstatSync(absolute);
   if(current.isSymbolicLink()||!current.isFile()||
    current.size!==stat.size||content.byteLength!==stat.size){
    throw new Error("PAY54_PUBLICATION_TREE_FILE_CHANGED");
   }
   totalBytes+=content.byteLength;
   files.push(Object.freeze({path,bytes:content.byteLength,sha256:SHA256(content)}));
  }
 }
 scan(root,[]);
 const sorted=files.sort((a,b)=>a.path.localeCompare(b.path,"en"));
 const digest=SHA256(Buffer.from(sorted.map(f=>
  [f.path,f.bytes,f.sha256].join("\0")).join("\n"),"utf8"));
 return Object.freeze({
  schema:"pay54.publication-tree-source-inspection.v1",
  fileCount:sorted.length,
  totalBytes,
  manifestSha256:digest,
  files:Object.freeze(sorted),
  findings:Object.freeze(findings),
  sourcePolicyPassed:findings.length===0&&sorted.some(x=>x.path==="index.html"),
  liveArtifactInspected:false,
  publicationAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
