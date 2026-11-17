"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54AccountSwitchAudit as inspect}
 from "../governance/pay54-batch27-account-switch-audit.mjs";
const x={priorSessionId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
 nextSessionId:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
 priorVersion:1,nextVersion:2,oldRevoked:true,
 auditRowCommitted:true,accountMemberVerified:true};
test("1167: atomic-looking session audit needs independently witnessed transaction",()=>{
 const r=inspect(x);
 assert.equal(r.sessionVersionIncremented,true);
 assert.equal(r.singleDbTransactionIndependentlyVerified,false);
 assert.equal(r.productionAccountSwitchEnabled,false);
});
test("1167: reuse of session ID, stale version and forged switch denied",()=>{
 for(const y of [{nextSessionId:x.priorSessionId},
  {nextVersion:1},{priorVersion:0},
  {auditRowCommitted:"true"}])
 assert.throws(()=>inspect({...x,...y}),
 /ACCOUNT_SWITCH_AUDIT_EVIDENCE_DENIED/);
});
