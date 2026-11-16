# PAY54 Batch 12 — Account Context Integration Security Acceptance (Item 349)

**Engineering branch:** project-titan
**Review date:** 2026-11-16
**Phase:** Source-only integration
**Operational release decision:** BLOCKED — no live customer database access or account switching

## Purpose

Create one trustworthy Personal/Business account experience without confusing a display choice with permission to access or move customer funds.

The source-only work completed through item 348 provides:

- A one-use account-selection intent that cannot authorise financial execution.
- An unmounted account-context reader that requires an authenticated server principal and checks authorised account membership.
- A selection-review composition that consumes the one-use intent, checks current account membership, revalidates principal identity, rereads account membership and verifies stable legal ownership before returning a minimal display projection.
- A browser response fence that discards results after switch/logout, rejects replay, and rejects a superseded request for the same resource.
- A balance-movement review that checks Personal/Business account ownership before and after awaiting snapshot retrieval, but explicitly refuses to label unaudited figures as customer-ready.

These controls do not create a trusted session-switch API, activate a banking backend or replace RLS.

## Account selection acceptance sequence

| Phase | Required evidence | Current |
|---|---|---|
| Authentication | Server-verified authenticated principal, CSRF/session controls, trusted cookie attributes and revocation | Existing source contracts; runtime proof missing |
| Catalogue | Database-provided, current and tenant-scoped Personal/Business memberships | Unmounted read-only source exists |
| Selection | Single-use intent, server identity revalidation, membership check, legal owner consistency | Source and adversarial tests committed |
| Context activation | Back-end authorises session/account binding with monotonic epoch and audit; invalidates prior account data | NOT IMPLEMENTED / NOT AUTHORISED |
| Sensitive data reads | Every wallet, card, recipient and transaction request verifies fresh authenticated account membership, database actor/RLS and transaction scope | Production proof missing |
| Browser concurrency | Old-account responses and older same-resource responses cannot render after a switch or newer request | Source-only response fence committed |
| Audit | Durable, immutable, timestamped account switch and access events with independently verified provenance | Not independently attested |
| Operations | Rate limiting, access denial alerts, suspend/revoke response, rollback and support playbook | Independent acceptance outstanding |

## Independent failure scenarios

1. User opens Personal account, starts a balance request, selects Business account; old Personal response must be rejected.
2. Two Balance Movement requests for one account overlap; only the newest request can be rendered.
3. Business viewer requests a Business account: display only, no payment initiation or approval authority.
4. Business membership is revoked between the first account read and selection response; selection must be rejected.
5. Principal or session changes between identity checks; selection must be rejected and intent consumed.
6. Tenant role or legal owner changes during an account balance review; return no data.
7. Selection intent is forged, copied or reused; reject rather than creating a context.
8. Account is suspended or KYC/KYB approval withdrawn; deny reads and future operations.
9. Frontend changes its selected account ID in browser storage; backend still refuses a foreign account.
10. PostgreSQL role, RLS policy, custody evidence or provider authentication is unavailable; fail closed rather than relying on source-only mocks.
11. Logout, session revocation and cross-tab switches invalidate stale response generation.
12. At no point may one account's balances, recipients, cards or transactions appear under another account.

## Next implementation order

1. **Database and server identity attestation:** separately approve a private staging environment and a least-privilege, independent real PostgreSQL RLS/identity test. The existing GitHub Actions disposable SQL checks are not sufficient for live customer access.
2. **Authenticated backend route:** implement and mount audited CSRF-protected account-context selection only after verifying real session issuance, token revocation, backend membership and multi-instance consistency.
3. **Canonical account context:** use a server-issued epoch and account-scoped capability that does not act as payment authority; revalidate on every financial read.
4. **Frontend binding:** connect the picker and browser stale-response fence to the authenticated backend response, clear every account-scoped cache, and prevent cross-tab stale renders.
5. **Verified ledger integration:** connect Balance Movement to signed/reconciled opening and closing snapshots from the account-scoped backend, with exact currency, time window and ledger ownership.
6. **End-to-end QA:** multiple simultaneous devices/tabs, revoke/suspend, role changes, network outage, request reordering, compromised browser input and Business role-specific permissions.
7. **Release review:** independent Security, Backend, Compliance, QA and Founder sign-off before any staging customer data, payment or production feature flags.

## Nonactivation statement

Source-only files cannot grant legal/regulatory authority, become real credentials, verify a live cloud environment or move funds. The account-switch UI intentionally remains **disabled** in the GitHub Pages development preview. The current PAY54-to-PAY54 internal/cross-border route previews remain **non-executable**.

**Release:** No-Go for live Personal/Business account switching and customer financial operations until these independent gates are evidenced and approved.
