"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const sql=readFileSync(fileURLToPath(new URL("../db/migrations/023_paytag_registration_idempotency.sql",import.meta.url)),"utf8");
test("P2B-B2A schema is scoped to verified account/session foundations",()=>{
 for(const s of ["BEGIN;","COMMIT;","pay54.paytag_registry","pay54.auth_sessions","REFERENCES pay54.account_contexts(id)","REFERENCES pay54.auth_sessions(session_id)","PAY54_PAYTAG_IDEMPOTENCY_REVIEW_REQUIRED"])assert.ok(sql.includes(s),s);
});
test("P2B-B2A stores digest-only idempotency and immutable request identity",()=>{
 for(const s of ["idempotency_key_digest bytea NOT NULL","request_digest bytea NOT NULL","octet_length(idempotency_key_digest) = 32","octet_length(request_digest) = 32","UNIQUE\n   (owner_account_id,idempotency_key_digest)","paytag_registration_correlation_unique","OLD.request_state <> 'PENDING'","NEW.request_state <> 'COMMITTED'","NEW.owner_principal_id IS DISTINCT FROM OLD.owner_principal_id","PAY54_PAYTAG_IDEMPOTENCY_IMMUTABLE"])assert.ok(sql.includes(s),s);
});
test("P2B-B2A requires committed tag and does not grant executable operations",()=>{
 for(const s of ["request_state IN ('PENDING','COMMITTED')","registry_tag_id uuid REFERENCES pay54.paytag_registry(tag_id)","request_state = 'COMMITTED' AND committed_at IS NOT NULL AND registry_tag_id IS NOT NULL","ENABLE ROW LEVEL SECURITY","FORCE ROW LEVEL SECURITY","REVOKE ALL ON pay54.paytag_registration_requests FROM PUBLIC"])assert.ok(sql.includes(s),s);
 assert.doesNotMatch(sql,/^\s*GRANT\s+(?:EXECUTE|INSERT|UPDATE|DELETE|SELECT|ALL)\b/im);
 assert.doesNotMatch(sql,/\bCREATE POLICY\b/i);
 assert.doesNotMatch(sql,/\bSECURITY DEFINER\b/i);
});
