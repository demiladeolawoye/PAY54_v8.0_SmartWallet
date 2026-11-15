# PAY54 Enterprise Engineering Office — Batch 08 Security Readiness Packet

**Date:** 2026-11-15  
**Branch:** `project-titan`  
**Scope:** Implementations 152–180, approved source-only development  
**Classification:** SOURCE REVIEW ONLY — independent operational security approval NOT GRANTED.

## Engineering security conclusion

The Batch 08 implementation is an **unmounted, source-only authenticated database actor architecture proof**, with explicit positive and negative tenant isolation tests performed exclusively against test-owned PostgreSQL relations and roles in disposable CI. It does **not** enable positive tenant reads against existing PAY54 account, membership or wallet tables, and **does not** turn the dormant `pay54_account_reader_role` into a login or reader.

### Key controls and their limits

| Control | Source implementation | Verified scope | Outstanding live requirement |
|---|---|---|---|
| Database identity model | `docs/security/batch-08-db-authentication-rfc.md` | Design distinguishes `current_user` from forgeable settings | Independently verify DB role/login and credential provenance |
| Positive/negative actor RLS proof | `backend/db/tests/016_role_identity_rls_proof.sql` | Only CI-created test table and NOLOGIN roles; rollback | Genuine tenant login/role-mapping model and positive authorisation tests on a staging schema |
| Forgeable GUC denial | `backend/db/tests/017_role_identity_adversarial.sql` | Spoofed `set_config` cannot change DB actor | Penetration testing against real SQL service credentials |
| Privilege rollback and inherited controls | `backend/db/tests/018_role_identity_rollback.sql` | Test-created actors/relations removed; PAY54 role still denied | Independently witnessed migration/grant/IAM evidence |
| Server-approved role metadata | `backend/security/account-db-principal.mjs`, `backend/governance/account-db-role-registry.mjs` | Opaque identity descriptor and exact subject/role mapping | Secure account-role provisioning/rotation and secret management |
| Ticket replay bounds | `backend/security/account-read-ticket.mjs`, `backend/security/account-db-read-intent.mjs` | Single-use local ticket, injected atomic nonce backend | Durable distributed replay store and key/session lifecycle |
| Database transaction actor check | `backend/db/account-actor-transaction.mjs` | Read-only transaction verifies `current_user` against approved descriptor; mismatches roll back and discard connection | Authenticated, least-privilege per-actor pool; a privileged shared switchable connection is not acceptable |
| Tenant read decision | `backend/domain/account-access-decision.mjs`, `backend/db/account-tenant-read-service.mjs` | Current membership/account ID and minimal disclosure checked on read | Security-reviewed RLS access grants and live revocation coupling |
| Audit delivery | `backend/security/account-decision-audit.mjs` | Ack-before-display for new source path; generic denial on failure | Durable tamper-evident sink, incident response, redaction, retention and alerting |
| Response policy | `backend/http/account-tenant-response.mjs` | Strict display fields and non-cacheable headers | Runtime HTTP integration, CSRF protection and load/pentest validation |
| Role separation | `backend/governance/account-authorisation-matrix.mjs` | Display and role labels never authorize finance | Independently reviewed financial maker/checker and execution controls |
| Offline governance | `backend/governance/account-db-identity-safety.mjs` | Mutation-tested source safety; NO live attestation | Review actual role membership, SQL policies, pool identities and effective routes |

### Mandatory open security decisions

1. **No real PostgreSQL account credentials:** A production connection pool must not be able to set an arbitrary tenant role. The CI operator's `SET ROLE` demonstration is deliberately privileged to simulate actors and **cannot establish real application authentication**.
2. **No real account SELECT grants:** Migration 013's `USING(false)` policies and migration 012's dormant NOLOGIN, no-grant account role remain unchanged. No positive policy is ready for deployment.
3. **No trusted browser session transport:** Signed session contracts exist, but there is no production auth endpoint, secure login, refresh, revocation store or distributed replay service.
4. **No live API:** The Personal/Business account-switcher and authenticated backend account route remain unmounted. Existing financial posting/reservations are unchanged.
5. **No production audit:** New acknowledgment contract is not connected to a durable, access-controlled security event store.
6. **No approved business financial execution:** Business KYB, beneficial owners, delegated signing, provider contractual scopes, transaction limits and maker/checker still require independent reviews.
7. **No cloud or launch authorization:** STG-01..STG-07, STG-05 egress/security, compliance and operational readiness remain BLOCKED.

### Verification and release gates

Disposable PostgreSQL 16 tests must verify baseline migrations 001–013, new SQL suites 016–018, historical negative suites, no surviving test grants and disabled payment/cloud flags. Node.js regression must cover database actor mismatch, transaction rollback/disposal, account read ticket replay, cross-account row rejection and audit failure. GitHub Actions CI results will be recorded in the Batch 08 consolidated report; **no CI result alone authorises live deployment**.

**Independent security reviewer:** NOT APPOINTED/SIGNED IN THIS BATCH.  
**Live database migration:** NOT RUN.  
**Google Cloud provisioning:** DISABLED.  
**Financial execution:** DISABLED.  
**Staging and production:** BLOCKED.  
**Next implementation:** STOP at 181; implementation 182 requires fresh explicit approval.
