"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54DashboardProviderWiring as inspect,
 inspectPay54CheckoutDashboardSource as real}
 from "../governance/pay54-batch25-card-provider-publication.mjs";

test("978: actual checkout dashboard wires development provider into funding",()=>{
 const result=real();
 assert.equal(result.developmentProviderScriptPresent,true);
 assert.equal(result.linkedCardFundingAdapterPresent,true);
 assert.equal(result.fundingServicePresent,true);
 assert.equal(result.productionWebPublicationAllowed,false);
 assert.equal(result.currentLivePublicationInspected,false);
 assert.equal(result.productionCardFundingApproved,false);
});
test("978: test-only external provider absent does not imply approved card payments",()=>{
 const result=inspect({html:
  '<script src="assets/js/engine/funding/adapters/linked-card.js"></script>'+
  '<script src="assets/js/services/funding.js"></script>'
 });
 assert.equal(result.developmentProviderScriptPresent,false);
 assert.equal(result.productionWebPublicationAllowed,true);
 assert.equal(result.productionCardFundingApproved,false);
});
test("978: encoded, cache-busted and path-normalised provider references are detected",()=>{
 const samples=[
  "assets/js/infrastructure/payments/providers/linked-card-development.js",
  "/assets/js/infrastructure/payments/providers/linked-card-development.js?v=1",
  "assets/js/infrastructure/payments/providers/linked-card%2Ddevelopment.js"
 ];
 for(const src of samples){
  const r=inspect({html:`<script src="${src}"></script>`});
  assert.equal(r.developmentProviderScriptPresent,true,src);
  assert.equal(r.productionWebPublicationAllowed,false,src);
 }
});
test("978: malformed or missing HTML cannot report public release eligibility",()=>{
 for(const html of ["",null,123]){
  assert.throws(()=>inspect({html}),/DEVELOPMENT_PROVIDER_PUBLICATION_DENIED/);
 }
});
