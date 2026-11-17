"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54CardProviderAcceptance as assess}
 from "../governance/pay54-batch25-card-partner-acceptance.mjs";
const evidence=Object.fromEntries([
 "contract-executed","regulatory-permissions-verified",
 "pci-dss-scope-accepted","sca-3ds2-integrated",
 "chargebacks-and-refunds-tested",
 "idempotent-capture-and-reversal-tested",
 "settlement-reconciliation-tested",
 "safeguarding-and-funds-flow-approved",
 "incident-and-operational-sla-approved",
 "provider-sandbox-negative-tests"
].map(x=>[x,"a".repeat(64)]));
test("1000: development card provider is blocked even with forged complete evidence hashes",()=>{
 const r=assess({
  providerId:"pay54.linked-card.development",
  providerType:"development",evidenceDigests:evidence
 });
 assert.equal(r.developmentProviderQuarantined,true);
 assert.equal(r.candidateReadyForHumanReview,false);
 assert.equal(r.paymentExecutionAuthorised,false);
 assert.equal(r.productionCardFundingEnabled,false);
});
test("1000: hypothetical regulated PSP is only a human-review candidate",()=>{
 const r=assess({
  providerId:"approved.psp.candidate",
  providerType:"regulated-psp",evidenceDigests:evidence
 });
 assert.equal(r.validEvidenceDigestCount,10);
 assert.equal(r.candidateReadyForHumanReview,true);
 assert.equal(r.regulatoryPartnerContractIndependentlyVerified,false);
 assert.equal(r.paymentExecutionAuthorised,false);
 assert.ok(Object.isFrozen(r));
});
test("1000: missing, unknown or weak provider proofs deny readiness",()=>{
 const r=assess({
  providerId:"provider.example",providerType:"regulated-psp",
  evidenceDigests:{"contract-executed":"bad"}
 });
 assert.equal(r.candidateReadyForHumanReview,false);
 assert.equal(r.missingCategories.length,10);
 assert.throws(()=>assess({
  providerId:"provider.example",providerType:"regulated-psp",
  evidenceDigests:{...evidence,"unsafe-bypass":"a".repeat(64)}
 }),/PROVIDER_ACCEPTANCE_INVALID/);
});
