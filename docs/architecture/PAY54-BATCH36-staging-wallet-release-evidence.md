# PAY54 Batch 36 — Authenticated Wallet Staging Integration & Deployment Readiness

## Protected baseline
PR #75 merged into `project-titan` at `17a34a17fdd04de34eb1ff828b1eb4a545bd9fb5`.

## Delivered in this package

### 1. Production-shaped restricted read migration and rollback safeguards
`backend/db/release/wallet-read-staging-preflight.sql` provides a **READ ONLY** database-owner preflight against the actual Batch 34 roles, absence of inherited grants, forced-RLS identity tables, denial of ledger SELECT, denial of HELD reservation SELECT and the inert execution status. It emits explicit blocked staging/production results and rolls back itself.

This is a predeployment check, **not** a live/persistent migration. The Batch 35 restricted function remains disposable, intentionally absent from persistent databases. A permanent implementation must include audited SQL with reviewed RLS policies, immutable migration digest, precise database principal, rehearsed transactional forward/rollback, operational credential controls and independent DBA/security approval. We will not secretly convert the Batch 35 disposable test into a deployed permanent function.

### 2. Actual backend session-to-database binding
`backend/src/authenticated-accounting-bridge.mjs` composes the existing strict bearer credential decoder with independently injected verified PostgreSQL-session and RLS-bound wallet-scope resolvers. The restricted accounting reader has been enhanced to require the same 32-byte digest, session UUID and session version **when the bridge opts in to that binding**; digest equality uses constant-time comparison.

The bridge revalidates the session and wallet membership after the restricted read completes. Logout, account switch, principal change, membership revocation, session rotation and cross-wallet proof are rejected, with generic errors and no raw credentials in the return envelope. It returns **accounting evidence only**, not customer-available funds.

The bridge remains unmounted. Live provider identity, real authenticated resolution and production PostgreSQL connection are separate dependencies, not established simply by passing CI mocks.

### 3. Concurrency and revocation
The existing disposable PostgreSQL suites already verify actual competing capture/release operations and subsequent revoked-session denial. This package adds Node adversarial post-read revocation/switch/epoch tests and exact digest binding. **A physical two-connection race in which a session is revoked mid-flight while a real restricted read transaction is in progress is still unverified.** Repeatable-read snapshots can retain an earlier version of a session; a post-read fresh connection or a serialised revocation barrier is required before live release.

### 4. Posted, HELD and customer-available accounting semantics
Existing Batch 33 `postedMinor - heldMinor` arithmetic is preserved, but **not promoted to `availableMinor`**. Provider settlement, customer-liability sign conventions, dispute holds, chargeback and reversal timing, negative account states, platform risk reserves, ledger-to-processor reconciliation and as-of revision consistency must be approved by Fintech Architecture and Compliance before a customer-available balance can be published.

### 5. Responsive dashboard journey
Existing dashboard read coordinator, presenter, account-switch cancellation, browser and layout regression workflows remain active. The new bridge **does not render data to the browser**. A real responsive authenticated customer journey must be separately proven on the deployed app using an approved backend endpoint, credential cookies or app attestation, screen reader and keyboard testing, viewport/device matrix and HTTP error-state acceptance. Demo data is not a substitute for this evidence.

### 6. Staging deployment and operational evidence
The existing `pay54-staging-uk-01` Google Cloud configuration and source-level evidence gates remain blocked pending live, read-only cloud verification: IAM inheritance, project/billing budgets, OIDC, Secret Manager, database connectivity, workload credentials, key rotation, private ingress, incident response, monitoring, audit logs, rollback recovery and ownership. No Terraform apply or cloud secret access is permitted by this package.

## Evidence and ownership

| Gate | Engineering owner | Present result | Release evidence required |
| --- | --- | --- | --- |
| Restricted database migration | Database Security | Inert catalogue check only | Independently approved function ACL/RLS migration and rollback rehearsal |
| Trusted session and wallet identity | Backend Security | Source integration + negative tests | Actual provider and DB login witness; credential/session binding |
| Mid-flight revocation race | QA / DBA | Post-read source recheck | Real dual-connection lock/cancellation/revocation test |
| Available balance | Fintech Architecture | Accounting-only calculation | Contracted settlement, reversal and reservation proof |
| Responsive customer UX | Frontend / Mobile QA | Existing unit/browser regressions | Authenticated devices, a11y, account switch, real backend |
| Staging environment | DevSecOps / Release | Source-only blocked posture | IAM, credentials, TLS, audit/monitoring, rollback, authorised change |

## Rollback and safety

- Source rollback: revert the new PR under branch protection; rerun wallet, account and PostgreSQL regressions.
- Disposable PostgreSQL: all temporary restricted function grants and row policies from Batch 35 are rolled back; Batch 36 preflight runs read-only and performs no DDL.
- Persistent database: **not modified**. A live rollback script cannot be credibly certified before the future forward migration, named database owner, privilege graph and live topology are agreed.
- Customer dashboard: unchanged and not connected to accounting evidence.

**Release decision: SOURCE ONLY; staging NO-GO; production NO-GO; customer-available balance NOT VERIFIED.**
