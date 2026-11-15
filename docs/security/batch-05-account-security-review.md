# PAY54 EEO — Batch 05 Account Security and Threat Reconciliation

**Assessment date:** 2026-11-15  
**Branch:** `project-titan`  
**Scope:** Source-only implementations 62–88  
**Classification:** Engineering source review only; NOT an independent operational security approval  
**Financial execution:** DISABLED · **Cloud provisioning:** DISABLED · **Staging/production release:** BLOCKED

## 1. Canonical query architecture

The immutable `backend/db/account-query-catalogue.mjs` owns three distinct, parameterised statements: `ACCOUNT_LIST`, `ACCOUNT_SELECT` and `PERSONAL_WALLET_IDS`. Existing account and wallet repositories now build their SQL from those definitions. The statement policy identifies the exact canonical template, checks UUID parameter count and authenticating-principal position, and rejects modified statements. Query catalogues contain no write operations or dynamic customer SQL construction.

The code-level read binding explicitly requires a server-verified opaque principal, canonical query and a separate transaction executor. The transaction executor performs one read-only query in a bounded transaction with local lock and statement timeouts, enforces row-security mode, and discards clients after failed/uncertain transactions. Its provider and pool are injected, never opened against live infrastructure by this batch.

**Residual concern:** SQL allowlisting and the `SET LOCAL row_security = on` instruction do **not** prevent a privileged PostgreSQL login from bypassing RLS. The database account-role migration intentionally retains NOLOGIN, NOBYPASSRLS, zero SELECT grants and zero members; a real authenticated DB login/RLS policy is still unapproved.

## 2. Response and UI boundaries

Read results are validated for bounded row count, field names, column count, primitive values and string lengths. Data from a faulty adapter is not automatically treated as a verified account; existing domain membership checks still apply. An unmounted audited account handler buffers small responses until the injected audit sink acknowledges their security decision. A failed audit means the buffered response is not released.

The account-picker presentation cache stores only `accountId`, `type` and `displayName` and clears on selection, logout, principal change or verification failure. A one-use selection-intent policy rejects forged, stale or replayed intents and explicitly marks them nonauthoritative. None of this selects a working wallet account, persists an authenticated session, reveals a balance or enables payments.

## 3. Abuse prevention and identity

A bounded per-instance request limiter is defined but **not mounted**. The key resolver must derive identity from trusted server context; arbitrary `X-Forwarded-For` or client IDs are not acceptable. The in-memory limiter cannot substitute for a shared/distributed rate-control mechanism in a multi-instance production service. A real trusted session verifier, revocation service and external gateway authentication remain separate work items.

## 4. SQL privilege and threat evidence

`backend/db/tests/013_account_privilege_matrix.sql` enumerates customer and financial objects for all existing PAY54 restricted roles. The disposable PostgreSQL CI deliberately verifies zero customer/ledger access and absence of financial procedure execution, rather than granting permissions to make a demo work.

The source-governance assessor requires the query catalogue to be shared by both readers, blocks inline query drift and unreviewed data grants, and confirms the handler is not turned into an open listener. Adversarial tests mutate its conditions to demonstrate that unsafe source edits are flagged. The checks establish **source compliance**, not runtime deployment verification.

## 5. Outstanding risks (all OPEN)

1. No cryptographic login/session verifier wired into a live account HTTP endpoint, and no real account access credentials or audit records.
2. No approved PostgreSQL login identity, RLS policy, live role membership or transaction-pool identity binding; the newly added reader role cannot access customer rows.
3. Read-only account-row validation is an additional boundary, not independent database tenancy proof. A malicious database superuser or altered SQL could bypass source-only controls.
4. Audit acknowledgement is unmounted and has not been tested against an actual durable log sink, buffering failures, distributed retries or incident alerting.
5. Rate limiting is per-instance and no edge rate limit is deployed; privacy-safe client identification is unapproved.
6. Personal/Business switch remains a preview. Business wallets, KYB, delegated organisation membership, regulatory/provider permissioning and actual account-scoped balances are not activated.
7. Existing financial migrations, ledger posting and reservations remain unchanged. No real-money capability, cloud infrastructure or staging/production release was activated.
8. STG-01..STG-07 independent operational and cloud approvals are still required.

## 6. Governance decision

**SOURCE_DESIGN_REVIEW_COMPLETE — NO_SECURITY_SIGNOFF**. The consolidated report must cite the actual current passing or failing GitHub CI runs. Engineering Batch 05 stops at item 91; implementation 92 requires fresh explicit user approval. No cloud provisioning, IAM, live database migration, funding or financial execution permission is implied.
