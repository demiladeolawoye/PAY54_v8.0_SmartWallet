"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const load=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const f=load("../db/release/writer-rls-v2-tenant-shadow-forward.sql");
const b=load("../db/release/writer-rls-v2-tenant-shadow-rollback.sql");
const d=load("../db/tests/batch63/001_tenant_shadow_role_denial.sql");
const ci=load("../../.github/workflows/pay54-batch22-postgres-rls-integration.yml");
const policies=["wallet","account","entry","journal","hold"];
test("each shadow tenant predicate is DENY guarded and cannot issue financial permission",()=>{
 assert.match(f,/current_database\(\)<>'pay54_disposable_ci'/);
 for(const p of policies){
  assert.ok(f.includes("CREATE POLICY pay54_w10_scope_"+p),p);
 }
 assert.equal((f.match(/AS PERMISSIVE FOR SELECT TO pay54_writer9_owner_candidate/g)||[]).length,5);
 assert.equal((f.match(/USING \(false AND/g)||[]).length,5);
 assert.ok(!/^\s*(?:GRANT|CREATE ROLE|ALTER ROLE|CREATE FUNCTION|ALTER TABLE|COMMIT\s*;\s*--\s*enable)/im.test(f));
 assert.match(f,/a\.legal_owner_subject=s\.principal_id/);
 assert.match(f,/m\.role='PERSONAL_OWNER'/);
 assert.match(f,/s\.revoked_at IS NULL/);
 assert.match(f,/s\.session_status='ACTIVE'/);
 assert.match(f,/s\.token_digest=decode/);
});
test("rollback removes exactly shadow policies and preserves existing FORCE RLS and Wave9",()=>{
 for(const p of policies)assert.ok(b.includes("DROP POLICY pay54_w10_scope_"+p),p);
 assert.match(b,/PAY54_W10_ROLLBACK_SECURITY_DRIFT/);
 assert.ok(!/DROP POLICY pay54_w9_/i.test(b));
 assert.ok(!/DROP POLICY pay54_wallet38_/i.test(b));
 assert.ok(!/DISABLE ROW LEVEL SECURITY/i.test(b));
});
test("effective role denies spoofed GUC and original canonical money functions",()=>{
 assert.match(d,/SET LOCAL ROLE pay54_writer9_owner_candidate/);
 assert.match(d,/set_config\('pay54\.w10_token'/);
 for(const k of ["WALLET_READ_EXPOSED","ENTRY_READ_EXPOSED","HOLD_READ_EXPOSED","FINANCIAL_EXECUTE_EXPOSED"])
  assert.ok(d.includes("PAY54_W10_"+k),k);
});
test("full physical PG16 regression executes Wave10 between Wave9 forward and rollback",()=>{
 const start=ci.indexOf("Apply and reverse reviewed wallet-v1 SQL only");
 const f9=ci.indexOf("backend/db/release/writer-rls-v1-forward-review.sql",start);
 const f10=ci.indexOf("backend/db/release/writer-rls-v2-tenant-shadow-forward.sql",start);
 const denial=ci.indexOf("backend/db/tests/batch63/001_tenant_shadow_role_denial.sql",start);
 const b10=ci.indexOf("backend/db/release/writer-rls-v2-tenant-shadow-rollback.sql",start);
 const b9=ci.indexOf("backend/db/release/writer-rls-v1-rollback-review.sql",start);
 const b38=ci.indexOf("backend/db/release/wallet-read-v1-rollback-review.sql",start);
 assert.ok(start>=0&&f9>start&&f10>f9&&denial>f10&&b10>denial&&b9>b10&&b38>b9);
 assert.ok(ci.includes('PAY54_FINANCIAL_EXECUTION: "false"'));
});
