"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54FxQuoteIntegrity as inspect}
 from "../governance/pay54-batch27-fx-quote-consistency.mjs";
const x={fromCurrency:"GBP",toCurrency:"NGN",
 quoteReference:"pay54-fx-001",rateNumerator:"200000",
 rateDenominator:"100",feeMinor:"250",
 nowMs:1800000000000,expiresAtMs:1800000060000};
test("1171: rate as integer ratio is precise but not provider execution proof",()=>{
 const r=inspect(x);
 assert.equal(r.rationalRateBasis,true);
 assert.equal(r.realMoneyFxExecutionAuthorised,false);
});
test("1171: stale, zero denominator, negative fee and identical currencies refused",()=>{
 assert.equal(inspect({...x,expiresAtMs:x.nowMs}).quoteNotExpired,false);
 for(const y of [{rateDenominator:"0"},{feeMinor:"-1"},
  {toCurrency:"GBP"}])
 assert.throws(()=>inspect({...x,...y}),/FX_QUOTE_INTEGRITY_DENIED/);
});
