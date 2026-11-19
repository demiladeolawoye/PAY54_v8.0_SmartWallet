"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {attestPay54DownloadedPagesTar}
 from "../governance/pay54-batch18-downloaded-pages-attestor.mjs";

const B=512;
function tarMember(path,text){
 const data=Buffer.from(text);
 const head=Buffer.alloc(B);
 head.write(path,0);
 head.write("0000644\0",100);
 head.write("0000000\0",108);
 head.write("0000000\0",116);
 head.write(data.length.toString(8).padStart(11,"0")+"\0",124);
 head.fill(32,148,156);head.write("0",156);
 let check=0;for(const x of head)check+=x;
 head.write(check.toString(8).padStart(6,"0")+"\0 ",148);
 return Buffer.concat([head,data,Buffer.alloc((B-data.length%B)%B)]);
}
function fixture({mutate=false,extra=false}={}){
 const root=mkdtempSync(join(tmpdir(),"pay54-artifact-compared-"));
 const site=join(root,"site"),tar=join(root,"artifact.tar");
 mkdirSync(site);
 writeFileSync(join(site,"index.html"),"PAY54 static");
 const files=[tarMember("index.html",mutate?"tampered":"PAY54 static")];
 if(extra)files.push(tarMember("backend/internal.js","private test file"));
 writeFileSync(tar,Buffer.concat([...files,Buffer.alloc(B*2)]));
 return {root,site,tar,clean:()=>rmSync(root,{recursive:true,force:true})};
}
test("636: exact tar files match only the safe reviewed source tree",()=>{
 const f=fixture();
 try{
  const r=attestPay54DownloadedPagesTar({
   restrictedSiteRoot:f.site,downloadedTarPath:f.tar
  });
  assert.equal(r.digestAndPathsMatched,true);
  assert.equal(r.expectedFiles,1);
  assert.equal(r.activeProductionArtifactVerified,false);
  assert.equal(r.deploymentApproved,false);
  assert.equal(r.productionRelease,"BLOCKED");
 }finally{f.clean();}
});
test("636: modified bytes or unexpected backend files invalidate a downloaded archive",()=>{
 for(const options of [{mutate:true},{extra:true}]){
  const f=fixture(options);
  try{
   const r=attestPay54DownloadedPagesTar({
    restrictedSiteRoot:f.site,downloadedTarPath:f.tar
   });
   assert.equal(r.digestAndPathsMatched,false);
   assert.ok(r.findings.some(x=>x==="FILE_DIGEST_MISMATCH"||
    x==="UNEXPECTED_MEMBER"));
  }finally{f.clean();}
 }
});
test("636: self-copied or missing artifact paths cannot establish provenance",()=>{
 const f=fixture();
 try{
  assert.throws(()=>attestPay54DownloadedPagesTar({
   restrictedSiteRoot:f.site,downloadedTarPath:join(f.site,"artifact.tar")
  }),/OVERLAP/);
  assert.throws(()=>attestPay54DownloadedPagesTar({}),/PATHS_REQUIRED/);
 }finally{f.clean();}
});
