"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {assessPay54Batch17DeploymentReadiness}
 from "../governance/pay54-batch17-deployment-readiness.mjs";

function fixture(){
 const root=mkdtempSync(join(tmpdir(),"pay54-deploy-readiness-"));
 mkdirSync(join(root,"assets/js"),{recursive:true});
 writeFileSync(join(root,"index.html"),'<script src="assets/js/app.js"></script>');
 writeFileSync(join(root,"dashboard.html"),'<h1>Safe preview</h1>');
 writeFileSync(join(root,"assets/js/app.js"),"export const preview=true;");
 return {root,clean:()=>rmSync(root,{recursive:true,force:true})};
}
test("612: even a clean source tree cannot self-authorise a Pages deployment",()=>{
 const f=fixture();
 try{
  const r=assessPay54Batch17DeploymentReadiness(f.root);
  assert.equal(r.candidateSourceReady,true);
  assert.equal(r.productionRelease,"BLOCKED");
  assert.equal(r.deploymentPermitted,false);
  assert.equal(r.currentPagesSettingsVerified,false);
  assert.equal(r.activeProductionArtifactVerified,false);
  assert.equal(r.independentFounderSecurityApproval,false);
  assert.equal(r.customerMoneyMovementEnabled,false);
 }finally{f.clean();}
});
test("612: actual PAY54 source remains blocked on dev-card and historical Pages risk",()=>{
 const r=assessPay54Batch17DeploymentReadiness();
 for(const reason of [
  "SITE_DEPENDENCY_GRAPH_INCOMPLETE",
  "DEVELOPMENT_PROVIDER_IN_FORBIDDEN_PUBLICATION_PATH",
  "LINKED_CARD_PUBLIC_RELEASE_CONTRACT_UNVERIFIED",
  "CURRENT_PAGES_DEPLOYMENT_NOT_INDEPENDENTLY_ATTESTED",
  "CURRENT_PUBLIC_EXPOSURE_P0_NOT_CLOSED",
  "RESTRICTED_DEPLOYER_AND_ROLLBACK_NOT_APPROVED"
 ])assert.ok(r.blockingReasons.includes(reason),reason);
 assert.equal(r.newSitePublished,false);
 assert.equal(r.deploymentPermitted,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
