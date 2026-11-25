"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {estimatePay54CloudSqlStaging as estimate}
 from "../governance/pay54-cloudsql-cost-assumptions.mjs";

test("scheduled micro includes persistent storage and backup charges",()=>{
 const a=estimate();
 assert.equal(a.tier,"micro");
 assert.equal(a.computeUsd,1.01);
 assert.ok(a.storageUsd>0);
 assert.ok(a.backupsUsd>0);
 assert.equal(a.spendingAuthorized,false);
 assert.equal(a.cloudResourceCreated,false);
 assert.equal(a.actualGbpBillingQuoteVerified,false);
 assert.equal(a.costCeilingEnforced,false);
 assert.ok(Object.isFrozen(a));
});
test("shared small and dedicated continuously operating are more expensive",()=>{
 const micro=estimate({computeHours:730}).subtotalUsd;
 const small=estimate({tier:"small",computeHours:730}).subtotalUsd;
 const dedicated=estimate({tier:"dedicated_2vcpu_8gib",computeHours:730}).subtotalUsd;
 assert.ok(micro<small&&small<dedicated);
 assert.ok(dedicated>120);
});
test("zero compute hours still carries allocated storage and backup costs",()=>{
 const x=estimate({computeHours:0});
 assert.equal(x.computeUsd,0);
 assert.ok(x.subtotalUsd>0);
});
test("network/ops costs are explicit rather than silently free",()=>{
 const a=estimate({networkAndOpsUsd:0});
 const b=estimate({networkAndOpsUsd:20});
 assert.equal(Number((b.subtotalUsd-a.subtotalUsd).toFixed(2)),20);
});
for(const invalid of [
 {tier:"enterprise_plus"},{billingCurrency:"GBP"},
 {computeHours:-1},{computeHours:731},{computeHours:1.5},
 {monthHours:0},{allocatedStorageGiB:5},{backupUsedGiB:-2},
 {storageUsdPerGiBHour:0},{networkAndOpsUsd:-1},
 {monthHours:NaN}
]){
 test("rejects untrusted estimator input "+JSON.stringify(invalid),()=>{
  assert.throws(()=>estimate(invalid),/PAY54_CLOUDSQL_COST_INPUT_DENIED/);
 });
}
