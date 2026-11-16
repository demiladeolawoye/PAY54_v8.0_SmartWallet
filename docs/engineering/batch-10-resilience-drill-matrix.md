# PAY54 Batch 10 — Implementation 254 Tenant Isolation and Audit Resilience Drill Matrix

**Date:** 2026-11-16  
**Classification:** Proposed test plan; NOT operationally executed in production.

| Scenario | Expected safe behaviour | Current evidence | Required future proof |
|---|---|---|---|
| Two tenants compete for same physical DB client | Reject second checkout, discard first on any uncertainty | Node tests: `account-role-pinned-pool.test.mjs` | Real credential-scoped pool integration |
| One tenant saturates role capacity | Deny excess checkout without allocating extra client | `account-credential-checkout-budget.test.mjs` | Measured p95/p99 latency, connection and cost budget |
| Credential rotates mid-read | Refuse returning result after post-read epoch recheck | `account-credential-epoch-guard.test.mjs` | Distributed revocation consistency across regions |
| Membership revoked during read | Result suppressed after second membership review | `account-credential-membership-gate.test.mjs` | Authoritative DB-backed membership and live incident drill |
| Caller forges account switch | Request fence refuses unrelated account/tenant and replay | `account-credential-request-fence.test.mjs` | Signed session, CSRF, device and identity proof |
| SQL client sets custom tenant variables | Synthetic RLS still hides target rows | `023_account_batch10_guc_spoof_denial.sql` | Independent production policy and query plan review |
| Privileged session changes current role | `session_user` remains distinguishable; reject shared login | `022_account_batch10_session_role_attestation.sql` | Actual TLS-issued per-actor credential review |
| Audit writer delays its acknowledgement | No positive account result released before receipt | `account-audit-disclosure-race.test.mjs` | Durable receipt verification and outage restoration |
| Audit event reused or writer times out | Replay blocked; no data disclosed | `account-audit-receipt-replay.test.mjs` | Cross-process idempotency and distributed event ID uniqueness |
| TLS hostname mismatch or insecure fallback | Source configuration rejected | `account-endpoint-review.test.mjs` | Real TLS negative certificate testing |
| Test role/grant artefacts persist | Fail test and block merge | `024_account_batch10_no_grants_rollback.sql` | Live role review before any migration |
| Public Pages source publish from engineering branch | Independent release approval required | GitHub-managed Pages builds seen in workflow runs | Inspect Pages administrative source and publishing settings |

## Launch acceptance gates
- Deny-by-default behaviour must hold under simultaneous cancellation, timeout, session expiry, failover, deployment rollback, regional partition and credential rotation.
- The audit writer's claimed persistence cannot alone establish durability; independent read-back and integrity evidence are required.
- Confirm all customer data and regulated payment functions remain disabled until independently signed-off security architecture, KYC/KYB, provider agreements, financial reconciliation and incident response.
- The tests above are not a production service-level objective or evidence of availability. Run synthetic staging and disaster-recovery drills only after explicit Founder approval.

**Operational exercise status:** NOT EXECUTED. No customer data, production environment or payment rail was involved.
