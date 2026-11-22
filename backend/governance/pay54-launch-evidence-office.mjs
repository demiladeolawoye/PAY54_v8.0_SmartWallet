"use strict";

/**
 * PAY54 Launch Evidence Register — generated from canonical source blockers.
 * Source-only reporting cannot close a P0 or authorise a release.
 */
import {fileURLToPath} from "node:url";
import {assessPay54OperationalBlockersInCheckout}
 from "./pay54-batch25-operational-blockers.mjs";

const EXPECTED=Object.freeze({
 "CR-PAGES-01":Object.freeze({owner:"Release Manager / DevSecOps",next:"Verify active public Pages settings, remote deployed artifact and private-path denial",evidence:"Authenticated Pages configuration export, deployed artifact hash, external reachability checks and rollback witness"}),
 "CR-CARD-01":Object.freeze({owner:"Fintech Architect / Backend",next:"Quarantine development card provider, contract issuer and verify customer-funding disablement",evidence:"Provider contract/approval, production SDK attestation, non-funding tests and owner signoff"}),
 "CR-DEPLOY-01":Object.freeze({owner:"DevSecOps / Security",next:"Validate protected deployer identity, OIDC scope and environment approvals",evidence:"Cloud IAM read-only inventory, environment rules, signed change record and rollback drill"}),
 "CR-IDENTITY-01":Object.freeze({owner:"Security / Backend",next:"Complete contracted identity, MFA, KYC and recovery staged verification",evidence:"Provider due diligence, consent and privacy review, staging recovery/step-up negative tests"}),
 "CR-DB-01":Object.freeze({owner:"Database / DevSecOps",next:"Select managed PostgreSQL provider and verify restricted credentials, TLS, RLS and restores",evidence:"DBA approved role graph, secret manager, certificate proof, staged restore and replica/backup recovery"}),
 "CR-RATE-01":Object.freeze({owner:"Backend / Performance",next:"Deploy and test distributed atomic rate limiting in controlled staging",evidence:"Shared state test, bypass/abuse tests, alert thresholds and load results"}),
 "CR-FINTECH-01":Object.freeze({owner:"Fintech / Compliance",next:"Contract legal UK–Nigeria partners and verify safeguarding, FX and payment settlement controls",evidence:"Signed regulated-provider contracts, corridor permissions, safeguarding model and reconciliation samples"}),
 "CR-QA-01":Object.freeze({owner:"QA / Mobile / Frontend",next:"Execute account isolation, mobile browser, accessibility and customer-journey acceptance",evidence:"Device matrix, WCAG audit, backend journey tests, tracked defects and signed UAT results"})
});
const IDS=Object.freeze(Object.keys(EXPECTED));
const fail=()=>{throw Error("PAY54_LAUNCH_EVIDENCE_REGISTER_DENIED");};
const format=s=>String(s).replaceAll("|","\\|").replaceAll("\n"," ");

export function buildPay54LaunchEvidenceRegister(report){
 if(report?.schema!=="pay54.batch25-cto-operational-blocker-register.v1"||
  report.productionReleaseAuthorised!==false||
  report.stagingReleaseAuthorised!==false||
  !Array.isArray(report.blockers)||report.blockers.length!==IDS.length)fail();
 const seen=new Set();
 const items=report.blockers.map(source=>{
  const assigned=EXPECTED[source?.id];
  if(!assigned||seen.has(source.id)||source.operationallyClosed!==false||
     !["P0","P1"].includes(source.priority)||
     typeof source.title!=="string"||typeof source.unverified!=="boolean")fail();
  seen.add(source.id);
  return Object.freeze({
   id:source.id,priority:source.priority,title:source.title,
   owner:assigned.owner,nextAction:assigned.next,
   acceptanceEvidence:assigned.evidence,
   status:"BLOCKED_PENDING_INDEPENDENT_EVIDENCE",
   sourceSignalUnverified:source.unverified,
   independentlyClosed:false
  });
 });
 if(IDS.some(id=>!seen.has(id)))fail();
 return Object.freeze({
  schema:"pay54.launch-evidence-office.v1",
  sourceOnly:true,independentlyVerified:false,
  productionAuthorised:false,persistentStagingAuthorised:false,
  blockers:Object.freeze(items),
  openBlockerCount:items.length,
  p0Count:items.filter(x=>x.priority==="P0").length,
  p1Count:items.filter(x=>x.priority==="P1").length,
  sourceStatus:"BLOCKED"
 });
}

export function renderPay54LaunchEvidenceMarkdown(report){
 if(report?.schema!=="pay54.launch-evidence-office.v1"||
  report.productionAuthorised!==false||
  report.sourceStatus!=="BLOCKED"||
  !Array.isArray(report.blockers)||report.blockers.length!==8)fail();
 return [
  "# PAY54 Enterprise Launch Readiness — Source Evidence Register",
  "",
  "**PRODUCTION NO-GO — staging and operational evidence not independently verified.**",
  "",
  `Outstanding blocker groups: ${report.openBlockerCount} (${report.p0Count} P0, ${report.p1Count} P1).`,
  "",
  "| ID | Priority | Engineering owner | Next action | Required acceptance evidence |",
  "| --- | --- | --- | --- | --- |",
  ...report.blockers.map(x=>`| ${format(x.id)} | ${format(x.priority)} | ${format(x.owner)} | ${format(x.nextAction)} | ${format(x.acceptanceEvidence)} |`),
  "",
  "Every item remains BLOCKED_PENDING_INDEPENDENT_EVIDENCE. This report cannot validate live cloud identity, URLs, provider contracts, customer acceptance, financial settlement or publication.",
  "",
  "Do not deploy migrations, enable cards/PayTag, publish the source repository root, or execute real money on the basis of this report.",
  ""
 ].join("\n");
}

export function createPay54LaunchEvidenceReportInCheckout(){
 return buildPay54LaunchEvidenceRegister(
  assessPay54OperationalBlockersInCheckout());
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 try{
  process.stdout.write(renderPay54LaunchEvidenceMarkdown(
   createPay54LaunchEvidenceReportInCheckout()));
 }catch{
  process.stderr.write("PAY54 launch evidence checkout audit denied\n");
  process.exitCode=1;
 }
}
