"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {auditAccountRlsSource,readAccountRlsSource} from "../governance/account-rls-audit.mjs";
test("source RLS denies all account types without granting customer reads",()=>{
 const result=auditAccountRlsSource(readAccountRlsSource());
 assert.equal(result.passed,true,JSON.stringify(result.issues));
 assert.equal(result.runtimeVerified,false);
});
test("weakened policies, extra grants and session-variable auth claims fail",()=>{
 const text=readAccountRlsSource();
 for(const mutation of [
  text.replace("AS RESTRICTIVE FOR SELECT","AS PERMISSIVE FOR SELECT"),
  text.replace("USING (false)","USING (true)"),
  text+" GRANT SELECT ON pay54.account_contexts TO pay54_account_reader_role;",
  text+" current_setting('pay54.principal_id')",
  text.replace("pay54_reader_membership_deny","pay54_reader_membership_allow")
 ])assert.equal(auditAccountRlsSource(mutation).passed,false);
});
