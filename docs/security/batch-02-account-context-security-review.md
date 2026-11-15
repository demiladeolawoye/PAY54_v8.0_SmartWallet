# PAY54 Enterprise — Batch 02 Account Security Review

**Version:** 1.0.0  
**Review date:** 2026-11-15  
**Scope:** Approved source-only implementations 17–30, `project-titan` branch  
**Decision:** ARCHITECTURAL_SOURCE_REVIEW_ONLY  
**Live deployment:** NOT APPROVED  
**Real-money execution:** DISABLED  
**Account switching:** NOT ENABLED  
**Cloud provisioning:** DISABLED

## 1. Trust architecture

The server-side account context boundary has five components:

1. **Session validation:** `backend/domain/trusted-account-principal.mjs` accepts a future injected backend verifier that must establish authenticated, non-revoked, non-expired identity. It marks successfully verified principal objects privately in a `WeakSet`. HTTP request data alone cannot mint this identity. It is not itself a password, token or signature verifier.
2. **Read-only repository:** `backend/domain/account-context-reader.mjs` constrains SQL parameters by authenticated principal and requested account UUID and independently validates returned account/membership rows. It cannot grant PostgreSQL permissions.
3. **Unregistered HTTP adapter:** `backend/http/account-context-handler.mjs` exposes a request-handler factory only; **no server imports or mounts it**. If mounted later, deployment must first establish actual session verification, safe database role grants/RLS and request limits.
4. **Data minimisation:** `backend/domain/account-public-projection.mjs` permits only account ID, type and label for verified/active accounts. It excludes legal owner, membership role, wallet amounts and credentials.
5. **Operation policy:** `backend/domain/account-operation-policy.mjs` produces policy eligibility only. It expressly sets `executionEnabled=false` and denies same-actor maker/checker approval. It is not a money posting API.

The existing Batch 01 account model and membership policy remain the single source for role eligibility; this batch does not clone or replace their rules.

## 2. Legacy wallet continuity

Migration `009_personal_wallet_binding.sql` introduces `pay54.personal_wallet_bindings` without modifying the existing wallet schema, immutable journal postings or financial operations. A binding may be inserted only when:

- Wallet owner subject and Personal account legal owner are equal;
- Account type is `PERSONAL` and the account is active/verified;
- The owner has an active `PERSONAL_OWNER` membership for that account;
- The wallet is not already bound (unique primary key).

Bindings are immutable: reassignment and deletion are rejected by a database trigger. RLS is enabled and forced; no application role is granted read/write access to the table. No existing wallet is automatically migrated, no API writes this table, and the test fixtures are rolled back.

**Residual design risk:** The binding trigger checks ownership at insert but does not itself guarantee all subsequent mutations of `pay54.wallets.owner_subject` and account membership status cannot change. A later approved migration must add a cross-table invariant or immutability rule before any live binding or account-backed wallet read is enabled. Account suspension must also be enforced at request time. Business wallet ownership remains OUT OF SCOPE and requires independent KYB/provider design.

## 3. Client-side account selection

`assets/js/dashboard/account-switch-selection.mjs` is a pure UI selection-intent state machine. It handles open, close, Escape, Home, End and arrow-key index movement. It cannot persist a selection, access balances, alter an account context or execute payments. No UI control is wired to it yet. Full accessible menu semantics, focus restoration, screen-reader announcements and responsive interaction still require end-to-end integration testing at a later stage.

## 4. Protected boundaries and regressions

- Existing `backend/db/migrations/001–008` were not edited.
- Existing ledger journals, balances, reservations, posting services and preview gates were not edited.
- New JavaScript code uses parameterized SQL and never directly opens a network listener.
- The PostgreSQL test workflow runs migrations only against an ephemeral PostgreSQL 16 GitHub Actions service, with synthetic fixtures rolled back.
- The account handler's 401, 404, 405 and 503 responses do not intentionally expose SQL error text, membership IDs or owner IDs.
- No IAM, Cloud Run, VPC, billing, live credentials, KYC/KYB or regulated provider changes occurred in this batch.

## 5. Critical remaining approval gates

1. Review legacy wallet-owner immutability, membership revocation and the database binding invariant.
2. Select a real authenticated session implementation, expiration/revocation model and audit trail; verify session fixation and replay controls.
3. Design restricted database roles, connection-pool session scoping, RLS policies and access logging before connecting the read adapter to PostgreSQL.
4. Implement rate limits and request-body limitations before mounting account routes.
5. Review multi-business delegation, authority-to-operate, KYB, beneficial ownership, audit events and maker/checker approval workflows.
6. Keep STG-05, STG-01..STG-07, production, financial and cloud deployment independently blocked.

## 6. Acceptance

This document is a source review, not a security certification. The engineering report will cite the exact passing GitHub CI run IDs and any failed intermediate checks. **No customer account or wallet can be declared live or production ready from this evidence.**
