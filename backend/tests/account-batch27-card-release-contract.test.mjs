"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54CardReleaseContract as inspect}
 from "../governance/pay54-batch27-card-release-contract.mjs";
const all={developmentProviderInBundle:false,providerContractExecuted:true,
 pciScopeAccepted:true,sca3ds2Tested:true,settlementReconciled:true,
 refundAndChargebackTested:true,approvedBackendTokenisation:true};
test("1096: even a complete PSP checklist cannot trigger real funding",()=>{
 const r=inspect(all);
 assert.equal(r.structurallyReadyForIndependentAudit,true);
 assert.equal(r.liveFinancialExecutionAuthorised,false);
 assert.equal(r.pspContractIndependentlyVerified,false);
});
test("1096: development simulator and missing PCI prevent acceptance",()=>{
 assert.equal(inspect({...all,developmentProviderInBundle:true})
  .structurallyReadyForIndependentAudit,false);
 assert.equal(inspect({...all,pciScopeAccepted:false})
  .structurallyReadyForIndependentAudit,false);
 assert.throws(()=>inspect({...all,approvedBackendTokenisation:"yes"}),
 /CARD_RELEASE_CONTRACT_DENIED/);
});
