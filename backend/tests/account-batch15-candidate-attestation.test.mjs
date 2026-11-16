"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
 mkdtempSync,mkdirSync,writeFileSync,rmSync
} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {stagePay54SiteCandidate}
 from "../governance/pay54-static-site-stage-builder.mjs";
import {inspectPay54CandidatePublicationAttestation}
 from "../governance/pay54-publication-candidate-attestation.mjs";

function fixture(){
 const root=mkdtempSync(join(tmpdir(),"pay54-stage-attestation-"));
 const source=join(root,"source"),target=join(root,"output");
 mkdirSync(join(source,"assets/js"),{recursive:true});
 mkdirSync(target);
 writeFileSync(join(source,"index.html"),'<script src="assets/js/app.js"></script>');
 writeFileSync(join(source,"assets/js/app.js"),"export const safe=true;");
 stagePay54SiteCandidate(source,target);
 return {root,source,site:join(target,"site"),
  clean:()=>rmSync(root,{recursive:true,force:true})};
}
test("475: exact bytes and restricted tree match without authorising production",()=>{
 const f=fixture();
 try{
  const r=inspectPay54CandidatePublicationAttestation({
   sourceRoot:f.source,stagedSiteRoot:f.site
  });
  assert.equal(r.sourceToStageMatches,true);
  assert.equal(r.blockers.length,0);
  assert.equal(r.candidateCount,2);
  assert.equal(r.sourceManifestSha256,r.stagedManifestSha256);
  assert.equal(r.actualGitHubPagesArtifactInspected,false);
  assert.equal(r.releaseAuthorised,false);
  assert.equal(r.productionRelease,"BLOCKED");
 }finally{f.clean();}
});
test("475: extra public file is an explicit stage blocker",()=>{
 const f=fixture();
 try{
  writeFileSync(join(f.site,"debug.json"),'{"synthetic":true}');
  const r=inspectPay54CandidatePublicationAttestation({
   sourceRoot:f.source,stagedSiteRoot:f.site
  });
  assert.equal(r.sourceToStageMatches,false);
  assert.ok(r.blockers.includes("STAGE_CONTENT_NOT_IDENTICAL"));
  assert.ok(r.blockers.includes("CANDIDATE_COUNT_MISMATCH"));
 }finally{f.clean();}
});
test("475: staged source content tampering is detected",()=>{
 const f=fixture();
 try{
  writeFileSync(join(f.site,"assets/js/app.js"),"export const safe=false;");
  const r=inspectPay54CandidatePublicationAttestation({
   sourceRoot:f.source,stagedSiteRoot:f.site
  });
  assert.equal(r.sourceToStageMatches,false);
  assert.ok(r.blockers.includes("MANIFEST_DIGEST_MISMATCH"));
 }finally{f.clean();}
});
test("475: unsafe staged tree is rejected even when source still matches safe paths",()=>{
 const f=fixture();
 try{
  writeFileSync(join(f.site,".env"),"synthetic test only");
  const r=inspectPay54CandidatePublicationAttestation({
   sourceRoot:f.source,stagedSiteRoot:f.site
  });
  assert.equal(r.sourceToStageMatches,false);
  assert.ok(r.blockers.includes("UNSAFE_PUBLICATION_TREE"));
 }finally{f.clean();}
});
