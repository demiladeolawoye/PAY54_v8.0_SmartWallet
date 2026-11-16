# PAY54 Batch 10 — Implementation 252 Independent Security Review Packet

**Date:** 2026-11-16  
**Review status:** SECURITY REVIEW REQUESTED, NOT INDEPENDENTLY APPROVED  
**Branch:** `project-titan`  
**Scope:** Source-only implementations 212–251, synthetic PostgreSQL and Node tests.

## Threat model

| Threat | Source control and evidence | Residual risk |
|---|---|---|
| Forged credential metadata | `account-credential-custody-policy.mjs` strict allow-listed evidence, no live attestation | Reviewer callback and custody descriptors can lie |
| Forged account binding | `account-credential-binding.mjs` issued WeakSet provenance plus exact identity/tenant/account/role/epoch mapping | No deployed signed principal-to-credential authorisation |
| Privileged role switching | `account-role-pinned-pool.mjs` test-only role checks and unconditional physical discard; disposable SQL 022 | Test-mode checks cannot prove operational per-tenant credentials |
| Cross-tenant read | Existing deny-only customer RLS; account membership and ownership reviewers; SQL 022–024 on synthetic relations | No approved positive customer RLS or table grants |
| Stale or revoked credential | `account-credential-epoch-guard.mjs` pre/post freshness and `account-credential-request-fence.mjs` one-use expiry | Callback state can go stale; no live rotation/revocation service |
| Exhausted connection pool | `account-credential-checkout-budget.mjs` capped test checkouts, cleanup after failure | No measured real pool pressure, cost or throughput |
| TLS downgrade or endpoint swap | `account-endpoint-review.mjs` deny insecure TLS configuration and unapproved host ID | No actual TLS handshake, CA pin chain or credential custody verified |
| Audit forgery / replay | `account-audit-receipt-gate.mjs` explicit ack, bounded event-ID reservation, replay denial | A callback may fabricate a durability claim; no tamper-resistant store |
| Post-read data leak | `account-receipt-audited-read.mjs` generic denial when audit missing and display-only flags | No deployed route, HTTP cache verification or retention controls |
| Unintended publication | GitHub-managed Pages builds observed on `project-titan` commits | Pages settings / source branch not yet independently inspected |

## Mandatory independent checks

1. Confirm IAM/workload identities and documented chain of custody for PostgreSQL credentials; verify secret separation and automatic rotation.
2. Inspect actual `session_user`, `current_user`, role membership, ownership, grants, RLS policies, bypass attributes and credential-to-tenant association under real TLS.
3. Perform concurrent cross-tenant reads and cross-account account-switch adversarial tests with independently issued credentials in a sandbox.
4. Prove that a revoked principal, stale epoch, cancelled query and pool checkout cannot return labels after revocation.
5. Test audit write acknowledgement against independently inspected append-only storage, expiry and restoration procedures.
6. Perform penetration testing, threat-model review, privacy assessment and business/KYB controls before positive customer RLS.
7. Review GitHub Pages source and release workflows; establish protected deployment roles, tagged releases and environment approvals.
8. Review UK/Nigeria launch corridor operational compliance, provider contracts and settlement/reconciliation independently.

## Source-only scope and release posture

No real PostgreSQL tenant role, credential, cloud resource, live IAM policy, production/staging grant, customer SELECT, payment execution or production release was activated by this batch. Positive RLS remains blocked. This review packet is a **request for independent sign-off**, not the sign-off itself.

**Required outcome before activation:** independently verified credential custody, tenant data isolation, durable audit, negative multi-tenant penetration tests, controlled deployment identity, compliance approvals and separate written Founder authorisation.
