"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
 mkdtempSync,mkdirSync,writeFileSync,readFileSync,
 readdirSync,symlinkSync,linkSync,rmSync
} from "node:fs";
import {join,resolve} from "node:path";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import {buildPay54PublicPreview as build}
 from "../release/pay54-public-preview-build.mjs";

const root=resolve(fileURLToPath(new URL("../../public-preview/",import.meta.url)));
const prepare=t=>{
 const dir=mkdtempSync(join(tmpdir(),"pay54-preview-qa-"));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 return dir;
};
test("1191: only two nonfinancial static files reach the isolated offline output",t=>{
 const directory=prepare(t),outputDirectory=join(directory,"safe");
 const result=build({outputDirectory});
 assert.equal(result.files.length,2);
 assert.equal(result.productionReleaseAuthorised,false);
 assert.equal(result.cloudOrWebsiteDeploymentPerformed,false);
 assert.deepEqual(result.files.map(x=>x.path).sort(),
  ["assets/css/preview.css","index.html"]);
 assert.equal(readdirSync(outputDirectory).includes("backend"),false);
 const html=readFileSync(join(outputDirectory,"index.html"),"utf8");
 assert.match(html,/not live banking/);
 assert.doesNotMatch(html,/<script\b/i);
 assert.doesNotMatch(html,/PAY54Session|linked-card-development/i);
 assert.throws(()=>build({outputDirectory}),/PUBLIC_PREVIEW_BUILD_DENIED/);
});
test("1191: script injection, nested source roots and symlinks fail closed",t=>{
 const dir=prepare(t),sourceRoot=join(dir,"source");
 mkdirSync(join(sourceRoot,"assets","css"),{recursive:true});
 const html=readFileSync(join(root,"index.html"));
 const css=readFileSync(join(root,"assets/css/preview.css"));
 writeFileSync(join(sourceRoot,"index.html"),Buffer.concat([
  html,Buffer.from('<script src="wallet.js"></script>')]));
 writeFileSync(join(sourceRoot,"assets/css/preview.css"),css);
 assert.throws(()=>build({sourceRoot,outputDirectory:join(dir,"deny")}),
  /PUBLIC_PREVIEW_BUILD_DENIED/);
 writeFileSync(join(sourceRoot,"index.html"),html);
 rmSync(join(sourceRoot,"assets/css/preview.css"));
 symlinkSync(join(root,"assets/css/preview.css"),
  join(sourceRoot,"assets/css/preview.css"));
 assert.throws(()=>build({sourceRoot,outputDirectory:join(dir,"deny2")}),
  /PUBLIC_PREVIEW_BUILD_DENIED/);
});
test("1191: source hardlinks, destination inside source and existing content never overwrite",t=>{
 const dir=prepare(t),sourceRoot=join(dir,"source");
 mkdirSync(join(sourceRoot,"assets/css"),{recursive:true});
 const original=join(root,"index.html");
 linkSync(original,join(sourceRoot,"index.html"));
 writeFileSync(join(sourceRoot,"assets/css/preview.css"),
  readFileSync(join(root,"assets/css/preview.css")));
 assert.throws(()=>build({sourceRoot,outputDirectory:join(dir,"deny")}),
  /PUBLIC_PREVIEW_BUILD_DENIED/);
 assert.throws(()=>build({sourceRoot:root,
  outputDirectory:join(root,"invalid-output")}),
 /PUBLIC_PREVIEW_BUILD_DENIED/);
});
