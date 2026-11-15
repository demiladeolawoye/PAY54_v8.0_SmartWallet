# PAY54 Enterprise — Batch 04 Account Read Access Security Review

**Date:** 2026-11-15  
**Review scope:** Implementations 47–60, source-only, `project-titan`  
**Classification:** Engineering source review, NOT independent security certification  
**Financial execution:** DISABLED  
**Cloud provisioning:** DISABLED  
**Staging release:** BLOCKED

## 1. Least-privilege PostgreSQL role

Migration `012_account_read_role_baseline.sql` creates `pay54_account_reader_role` as a NOLOGIN, NOINHERIT, NOBYPASSRLS, non-owner role with **zero** SELECT, write or function execution privileges. Harmless schema USAGE is the only capability granted. The role has no members and cannot be used to read customer data until additional, separately approved identity-binding and RLS controls are implemented. The tested SQL script asserts denial of account, wallet, ledger, posting and customer operations.

No existing ledger or financial migration source was modified.

## 2. Backend transaction isolation

`backend/db/account-read-transaction.mjs` requires an injected trusted pool, a privately verified principal and an independently provided SQL allowlist. Each call obtains a separate PostgreSQL client, begins a read-only transaction, sets local timeouts, executes one bounded query and commits or rolls back, then releases the connection. Failed transactions cause client disposal. It does not open a pool, supply a database credential, create a login role, or directly connect to live data.

The adapter is not wired to the existing account HTTP endpoint. A future reviewer must ensure actual PostgreSQL transaction isolation, connection pool resets, TLS, statement timeouts, credential rotation, audit logging and cross-request authorisation.

## 3. Exact account SQL template policy

`backend/db/account-sql-policy.mjs` fail-closes on unrecognized SQL text, unexpected parameters and principal mismatch. The allowed text shapes correspond to existing read-only account list, account select and verified personal wallet ID queries. This is a defense-in-depth SQL template check, not a SQL parser, not a database credential boundary and not a substitute for per-user RLS.

**Architectural debt:** SQL query text is represented in both existing readers and this defensive policy. A future change should centralize the immutable query definitions and test strict equivalence before any real adapter integration, eliminating source drift. Until then, neither reader is connected to this transaction adapter.

## 4. Audit and HTTP protection

`backend/security/account-access-audit.mjs` creates only bounded operation/outcome/reason/time audit events. It excludes customer IDs, account IDs, tokens and session payloads. Missing or failing audit sinks propagate errors. This contract is not yet wired to a live audit pipeline.

`backend/http/account-context-handler.mjs` adds cache-protection, Vary, CORP, clickjacking and permissions headers; cross-origin request origins are denied until an independently approved origin policy exists. No account handler is mounted, and user-facing switching remains a preview.

## 5. Current lifecycle vs financial authorisation

`backend/domain/account-read-revalidation.mjs` requests current account membership and wallet eligibility for each read-only preview. It expressly returns `transactionAuthorised=false`, `financialExecutionEnabled=false` and `consistency=NON_ATOMIC_PREVIEW_ONLY`. This is **not** a coherent financial snapshot. Transactions and balances still require an independently designed atomic posting/read consistency model.

## 6. Verification boundaries

- Disposable PostgreSQL 16 tests apply source migrations 001–012 and verify role privileges and previous account/ledger restrictions.
- Node tests check pool rollback and disposal, SQL template failures, audit redaction, HTTP response behavior and revocation.
- These are CI/source assertions; no independently witnessed cloud/runtime evidence, credential security assessment, KYC/KYB, business-account activation, customer financial data or pentest was provided.
- Preserve staging and production release gates as BLOCKED; keep provisioning and financial modes off.

## 7. Outstanding sign-offs

Before mounting a live account endpoint, independently approve: authenticated identity issuer/verifier, least-privileged login role and credentials, securely bound RLS enforcement, query-text centralisation, access logging and immutable audit storage, rate limits, session refresh and replay controls, consumer/business KYB and account ownership migration plan, formal security threat review, and STG-01 through STG-07 operational approvals.

**Batch 04 may be closed as source-complete only when the integrated GitHub Action is green. Item 62 needs new explicit user approval.**
