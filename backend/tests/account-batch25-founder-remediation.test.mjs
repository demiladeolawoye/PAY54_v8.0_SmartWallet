"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {renderPay54FounderRemediationReport as render,
 renderPay54CurrentFounderReview as current}
 from "../governance/pay54-batch25-founder-remediation.mjs";
import {reconcilePay54OperationalBlockers}
 from "../governance/pay54-batch25-operational-blockers.mjs";

const sha="a".repeat(40);
const safe=reconcilePay54OperationalBlockers({
 stagingGate:{
  release:"BLOCKED",deploymentAuthorized:false,
  provisioningAuthorized:false,financialExecutionAuthorized:false,
  integrityPassed:true
 },
 rootRisk:{
  sourceRootPublicationBlocked:true,activePagesSourceVerified:false,
  remotePublishedArtifactInspected:false
 },
 cardWiring:{
  developmentProviderScriptPresent:true,
  productionCardFundingApproved:false
 },
 releaseWorkflowRisk:{
  pagesSettingsVerified:false,deployerCloudIamVerified:false,workflowCount:70
 }
});
test("988: report identifies P0 Pages, cards, deployer, identity and regulation",()=>{
 const markdown=render({sourceSha:sha,operationalReport:safe});
 for(const id of ["CR-PAGES-01","CR-CARD-01","CR-DEPLOY-01",
  "CR-IDENTITY-01","CR-FINTECH-01"]){
  assert.ok(markdown.includes(id));
 }
 assert.ok(markdown.includes("NO-GO"));
 assert.equal(markdown.includes("APPROVED"),false);
 const currentMarkdown=current({sourceSha:sha});
 assert.ok(currentMarkdown.includes("CR-PAGES-01"));
});
test("988: source report cannot claim closed risks or render injected markup",()=>{
 assert.throws(()=>render({sourceSha:"bad",operationalReport:safe}),
  /FOUNDER_REMEDIATION_REPORT_DENIED/);
 const bad={...safe,blockers:safe.blockers.map((b,i)=>
  i===0?{...b,operationallyClosed:true}:b)};
 assert.throws(()=>render({sourceSha:sha,operationalReport:bad}),
  /FOUNDER_REMEDIATION_REPORT_DENIED/);
 const escaped={...safe,blockers:safe.blockers.map((b,i)=>
  i===0?{...b,title:"<script>alert(1)</script>"}:b)};
 assert.throws(()=>render({sourceSha:sha,operationalReport:escaped}),
  /FOUNDER_REMEDIATION_REPORT_DENIED/);
});
