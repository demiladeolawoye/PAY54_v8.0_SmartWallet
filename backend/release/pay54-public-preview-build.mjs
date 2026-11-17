"use strict";

/**
 * PAY54 Batch 28 / 1190 — build a *nonfinancial* static preview artifact.
 *
 * SECURITY BOUNDARY:
 *   - Source is exactly two reviewed public-preview files.
 *   - No checkout-root copy, no dashboard script, login, wallets, provider,
 *     payment rail, backend, SQL, documentation or internal workflow source.
 *   - No symlinks, hardlinks or mutable source files, no existing output
 *     replaced, no script injection or network access.
 *   - Atomic new-directory promotion; output remains OFFLINE.
 *   - Builds never deploy or authorise actual financial services.
 */
import {
  lstatSync,readFileSync,mkdirSync,mkdtempSync,renameSync,
  rmSync,statSync,writeFileSync
} from "node:fs";
import {dirname,join,resolve,relative,sep} from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
import {verifyPay54StaticReleaseDirectory}
 from "../governance/pay54-batch25-static-release-verify.mjs";

const SOURCE=resolve(dirname(fileURLToPath(import.meta.url)),"../../public-preview");
const FILES=Object.freeze(["index.html","assets/css/preview.css"]);
const deny=()=>{throw new Error("PAY54_PUBLIC_PREVIEW_BUILD_DENIED");};
const hex=bytes=>createHash("sha256").update(bytes).digest("hex");
const inside=(parent,child)=>{
 const rel=relative(parent,child);
 return rel!==""&&!rel.startsWith(".."+sep)&&rel!==".."&&!resolve(child).startsWith(parent+sep+"..");
};

export function buildPay54PublicPreview({
 sourceRoot=SOURCE,outputDirectory,
}={}){
 if(typeof sourceRoot!=="string"||typeof outputDirectory!=="string"||
    !sourceRoot.trim()||!outputDirectory.trim())deny();
 const source=resolve(sourceRoot),target=resolve(outputDirectory);
 if(source===target||inside(source,target)||inside(target,source))deny();
 const parent=dirname(target);
 let temp,completed=false;
 try{
  if(!lstatSync(source).isDirectory()||
     lstatSync(source).isSymbolicLink())deny();
  if(!statSync(parent).isDirectory()||
     lstatSync(parent).isSymbolicLink())deny();
  try{lstatSync(target);deny();}
  catch(e){if(e?.code!=="ENOENT")deny();}
  // Each path and every containing source directory must be real, never links.
  const sourceFiles=FILES.map(path=>{
   const absolute=resolve(source,path);
   if(!inside(source,absolute))deny();
   const segments=path.split("/");
   let cursor=source;
   for(const segment of segments.slice(0,-1)){
    cursor=join(cursor,segment);
    const st=lstatSync(cursor);
    if(!st.isDirectory()||st.isSymbolicLink())deny();
   }
   const st=lstatSync(absolute);
   if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||
      st.size<100||st.size>256*1024)deny();
   const bytes=readFileSync(absolute);
   if(bytes.length!==st.size)deny();
   return {path,bytes};
  });
  const html=sourceFiles[0].bytes.toString("utf8");
  const css=sourceFiles[1].bytes.toString("utf8");
  if(!html.includes("Product preview — not live banking")||
     !html.includes("No funds or personal financial information")||
     !html.includes('href="assets/css/preview.css"')||
     /<script\b|\bon(?:click|load|error)\s*=|<form\b|<iframe\b/i.test(html) ||
     /@import|url\s*\(|expression\s*\(/i.test(css))deny();
  temp=mkdtempSync(join(parent,".pay54-preview-build-"));
  for(const {path,bytes} of sourceFiles){
   const file=join(temp,path);
   mkdirSync(dirname(file),{recursive:true});
   writeFileSync(file,bytes,{flag:"wx",mode:0o644});
  }
  const validation=verifyPay54StaticReleaseDirectory({directory:temp,
    maxFiles:2,maxTotalBytes:512*1024});
  if(validation.fileCount!==2 ||
     validation.entries.some(x=>!FILES.includes(x.path)))deny();
  renameSync(temp,target);
  completed=true;
  return Object.freeze({
   schema:"pay54.nonfinancial-preview-build.v1",
   target,
   files:Object.freeze(validation.entries.map(x=>Object.freeze({
    path:x.path,sha256:x.sha256,bytes:x.bytes
   }))),
   includesFinancialApplications:false,
   currentGitHubPagesSiteInspected:false,
   cloudOrWebsiteDeploymentPerformed:false,
   productionReleaseAuthorised:false
  });
 }catch{deny();}
 finally{if(!completed&&temp)rmSync(temp,{recursive:true,force:true});}
}

if(process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 try{
  const outcome=buildPay54PublicPreview({
   outputDirectory:process.argv[2]
  });
  process.stdout.write(JSON.stringify(outcome)+"\n");
 }catch{
  process.stderr.write("PAY54 public preview build rejected; nothing deployed\n");
  process.exitCode=1;
 }
}
