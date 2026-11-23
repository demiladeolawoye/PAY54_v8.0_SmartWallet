"use strict";

import {auditStagingCloudReadiness,loadStagingCloudReadinessSources}
 from "../security/staging-cloud-readiness.mjs";

/**
 * PAY54 Batch 37 — immutable source-backed staging evidence matrix.
 *
 * This register is intentionally NOT an operational attestation engine.
 * External cloud inventory, signed approval, device logs and regulated
 * settlement cannot be manufactured by code or self-declared booleans.
 */
const GATES=Object.freeze([
 Object.freeze({id:"STG-WALLET-DB-01",owner:"Principal DBA / Security",
  required:"Independently reviewed persistent read-function migration, role grants, forced RLS, transactional rollback and restored-backup proof"}),
 Object.freeze({id:"STG-WALLET-IAM-02",owner:"DevSecOps / Security",
  required:"Read-only cloud IAM effective-principal inventory, approved workload identity and restricted database role mapping"}),
 Object.freeze({id:"STG-WALLET-TLS-03",owner:"Security / DevSecOps",
  required:"Real managed PostgreSQL verify-full server hostname and CA witness, Secret Manager rotation metadata and zero credential disclosure"}),
 Object.freeze({id:"STG-WALLET-RACE-04",owner:"DBA / QA",
  required:"Independent physical revocation-vs-read test with new committed-state fence; stale RR snapshot must never authorise a customer response"}),
 Object.freeze({id:"STG-WALLET-FUNDS-05",owner:"Fintech Architect / Compliance",
  required:"Contracted payment processor custody, settled transaction reconciliation, holds, reversals, disputes and approved liability signs"}),
 Object.freeze({id:"STG-WALLET-API-06",owner:"Backend Security",
  required:"Real authenticated route with principal-scoped financial RLS, secure transport, rate-limiting, audit and replay denial"}),
 Object.freeze({id:"STG-WALLET-UX-07",owner:"Frontend / Mobile QA",
  required:"Authenticated mobile/desktop device matrix with screen-reader, keyboard, zero balance, stale-switch and offline/error acceptance"}),
 Object.freeze({id:"STG-WALLET-OPS-08",owner:"Release Manager",
  required:"Named release owner, approved change, verified service rollback, operational monitoring, incident escalation and no real-money controls"})
]);

export function assessPay54WalletStagingOperationalEvidence({
 cloudReport
}={}){
 if(!cloudReport||cloudReport.phase!=="STG-04"||
    cloudReport.scope!=="OFFLINE_SOURCE_AUDIT"||
    cloudReport.stagingRelease!=="BLOCKED"||
    cloudReport.cloudProvisioning!=="DISABLED"||
    cloudReport.financialExecution!=="DISABLED"||
    !Array.isArray(cloudReport.controls)) {
   throw Error("PAY54_WALLET_STAGE_EVIDENCE_DENIED");
 }
 return Object.freeze({
  schema:"pay54.wallet-staging-evidence.v1",
  sourceAuditOnly:true,
  sourceCloudChecks:cloudReport.totals.PASS,
  independentCloudAttestation:false,
  runtimeDatabaseAuthority:false,
  providerSettlementVerified:false,
  realCustomerDeviceAcceptance:false,
  stagingDeploymentAuthorised:false,
  productionAuthorised:false,
  totalOutstanding:GATES.length,
  gates:Object.freeze(GATES.map(x=>Object.freeze({
    ...x,status:"AWAITING_EXTERNAL_INDEPENDENT_EVIDENCE"
  })))
 });
}

export function renderPay54WalletStagingEvidenceMarkdown(report){
 if(report?.schema!=="pay54.wallet-staging-evidence.v1"||
    report.stagingDeploymentAuthorised!==false||
    report.productionAuthorised!==false||
    report.totalOutstanding!==8||
    report.gates?.length!==8)throw Error("PAY54_WALLET_STAGE_EVIDENCE_DENIED");
 return [
  "# PAY54 Batch 37 — Staging Wallet Evidence",
  "",
  "**Staging NO-GO · Production NO-GO · No live customer available balance**",
  "",
  "This is source-derived evidence tracking, not live GCP or partner attestation.",
  "",
  "| Control | Owner | Required independent operational evidence | Status |",
  "| --- | --- | --- | --- |",
  ...report.gates.map(x=>`| ${x.id} | ${x.owner} | ${x.required} | ${x.status} |`),
  "",
  "No cloud credentials, secret values, production SQL grants or payment endpoints are permitted by this report.",
  ""
 ].join("\n");
}

export function assessPay54WalletStagingInCheckout(){
 const cloudReport=auditStagingCloudReadiness(loadStagingCloudReadinessSources());
 return assessPay54WalletStagingOperationalEvidence({cloudReport});
}
