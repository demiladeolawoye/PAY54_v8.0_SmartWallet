# PAY54 Batch 09 — Independent Security Review Packet

**Date:** 16 November 2026. **Branch:** `project-titan`. **Scope:** Source-only items 182–208.  
**Independent external reviewer sign-off:** NOT OBTAINED. **Release:** BLOCKED.

## Security design under review

1. **Actor provenance:** PostgreSQL `current_user` and `session_user` are checked independently, together with `rolcanlogin`, `rolsuper`, `rolbypassrls`, `rolinherit`, role membership count, table ownership and row-security setting. A tenant actor switching from a privileged session is rejected. Even this inspection does not independently prove credential custody or rule out malicious SQL proxies.
2. **External role review:** The connection provenance contract now requires explicit, structured evidence of no financial privileges, no other-tenant role assumption and active transaction scope. It no longer fabricates safe values from a boolean callback. An independently trusted and durable source for this review remains outstanding.
3. **Connection lifecycle:** Quarantine rejects overlapping checkout of the same client object and discards clients on callback failures. The existing transaction adapter independently enforces read-only scope. Real pool TLS, isolation, cancellation and role membership controls remain to be proved.
4. **Replay and membership:** One-use leases and a fresh authoritative membership decision are required in source; neither equals live provider-verified session revocation or transaction-atomic financial authorisation.
5. **Audit and privacy:** Account data is not exposed by the audited display path until audit acknowledgement. Any exception is generalised, and read-only public response errors do not include tokens, tenant names or SQL.
6. **SQL proof:** Test-only NOLOGIN roles, a separate RLS table, positive same-role and negative cross-role reads, a forged `current_setting` denial and full transactional rollback. No change to PAY54 migrations 001–013 or actual customer table privileges.

## Residual risks — all OPEN

- A shared privileged application connection permitted to `SET ROLE` to arbitrary tenant actors remains unsuitable for live service use. The source actor policy cannot validate external credentials without independently collected evidence.
- No approved secure per-tenant login provisioning, TLS credentials, mapping rotation, least-privilege production grant or positive real PAY54 customer-data RLS policy exists.
- Real revocation and membership stores, session identity transport, browser CSRF, durable tamper-evident audit storage and distributed rate limits remain unimplemented or unmounted.
- SQL role-based synthetic tests prove database semantics on test tables, not the security of customer account or money storage.
- Cross-border provider approval, UK/Nigeria regulatory compliance, business KYB/beneficial ownership and financial maker/checker remain separate gates.
- No complete independent cloud STG-05 network/egress review, resilience exercise, penetration test or release sign-off has occurred.

## Mandatory gates before positive customer reads

Independent reviewer must inspect actual `pg_roles`, `pg_auth_members`, `pg_policy`, `pg_class` ownership, table/function grants and live credential-to-tenant trace. Validate the complete signed-session, identity map, pool and revocation chain with a test tenant other than the caller. Confirm RLS does not trust a caller-settable GUC and that audit sinks are durable and fail closed.

**Approved source boundary:** no production roles, grants, migrations, route mounting, cloud provisioning, financial execution or deployment. Implementation 212 requires fresh user approval.
