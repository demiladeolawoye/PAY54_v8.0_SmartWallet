"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {verifyPay54StaticReleaseDirectory as verify}
 from "../governance/pay54-batch25-static-release-verify.mjs";

function setup(t){
 const dir=mkdtempSync(join(tmpdir(),"pay54-content-boundary-"));
 t.after(()=>rmSync(dir,{force:true,recursive:true}));
 mkdirSync(join(dir,"assets"));mkdirSync(join(dir,"assets","js"));
 writeFileSync(join(dir,"index.html"),"<html><body>PAY54</body></html>");
 return dir;
}

test("974: common secret formats, signing keys and sourceMappingURL deny offline candidate",t=>{
 const dir=setup(t);
 const threats=[
  "-----BEGIN PRIVATE KEY-----\nUNSAFE\n-----END PRIVATE KEY-----",
  "-----BEGIN RSA PRIVATE KEY-----\nunsafe",
  "github_pat_"+ "Z".repeat(30),
  "ghp_"+ "z".repeat(40),
  "AKIA"+ "A".repeat(16),
  "const token = \"sk_live_"+ "x".repeat(24)+"\";",
  "//# sourceMappingURL=app.js.map"
 ];
 for(const bytes of threats){
  const file=join(dir,"assets","js","app.js");
  writeFileSync(file,bytes);
  assert.throws(()=>verify({directory:dir}),
    /STATIC_RELEASE_BUNDLE_DENIED/);
  rmSync(file);
 }
});
test("974: missing utf8 bytes and empty files are invalid static assets",t=>{
 const dir=setup(t);
 const file=join(dir,"assets","js","app.js");
 writeFileSync(file,Buffer.from([0xff,0xfe,0xfa]));
 assert.throws(()=>verify({directory:dir}),
   /STATIC_RELEASE_BUNDLE_DENIED/);
 rmSync(file);
 writeFileSync(file,"");
 assert.throws(()=>verify({directory:dir}),
   /STATIC_RELEASE_BUNDLE_DENIED/);
});
test("974: benign static asset content produces SHA256 and not a deployment approval",t=>{
 const dir=setup(t);
 writeFileSync(join(dir,"assets","js","app.js"),
  'document.documentElement.dataset.app="PAY54";');
 const result=verify({directory:dir});
 assert.equal(result.fileCount,2);
 assert.equal(result.activePagesPublicationVerified,false);
 assert.equal(result.deploymentAuthorised,false);
});
