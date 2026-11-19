# PAY54 Architecture Decision Record — Batch 22 / 864

**Title:** Preserve canonical PostgreSQL account identity and isolate session readers
**Decision:** Accepted for source review, **not authorised for production migration**
**Review:** Draft PR #10, stacked on unmerged Batch 21 PR #9

## Established schema is authoritative

Migrations 001–013 remain in their original reviewed order. Migration 008 already owns
`pay54.account_contexts` and `pay54.account_memberships`. It defines the Personal/Business
account model, canonical membership role constraints, immutable legal ownership and
forced row-level security. Migration 009 binds legacy Personal wallets; migration 013
retains a RESTRICTIVE deny policy for the original, unassigned
`pay54_account_reader_role`.

During development, an initial competing `pay54.accounts` schema caused disposable
CI to fail as migration 008 correctly rejected a duplicate `account_memberships`
table. The overlapping draft migrations were **deleted**, adapters were updated to
the established table/column names, and a read-only migration inventory guard was
added to prevent regression.

## Additive migrations

| Migration | Responsibility | Production effect today |
| --- | --- | --- |
| 014 | Credential-digest-indexed session table; unassigned, NOLOGIN, read-only role | None; no deployed store or issued credentials |
| 015 | Append-only account-context audit with separate NOLOGIN insert role | None; no live audit writer |
| 016 | Guard session active-account assignment using existing canonical account and membership records | None; SQL not deployed |
| 017 | New NOLOGIN account-directory reader role, actor-filtered RLS on canonical accounts/members | None; no LOGIN role membership or approved endpoint |

The old account reader remains denied. New roles own no tables, have no
BYPASSRLS/SUPERUSER privileges and receive no ledger or financial-operation
privileges.

## Runtime composition and proof

`postgres-session-resolver.mjs` hashes a canonical 256-bit bearer token; uses an
isolated, transaction-local session digest; verifies a restricted role, forced RLS,
active/expiry/version status, then returns a server-derived principal.
`postgres-account-read-transaction.mjs` binds that principal transaction-locally
and reads only account contexts/memberships under PostgreSQL RLS. Its immutable
snapshot is passed to the existing Batch 21 authorisation service, which verifies
session continuity again before returning an account directory.

`postgres-account-composition.mjs` requires **two different pools**: an
authentication reader and an account-directory reader. Neither is provisioned or
mounted in the foundation HTTP server. Database-table RLS settings and privileges
are checked against actual PostgreSQL catalogues at each read; this still does
not prove a real deployed environment is configured correctly.

## Security invariants

- Do not infer identity, owner or role from client-provided account IDs.
- Do not permit bank/wallet/ledger DML through account-discovery roles.
- Do not let session token scope or actor scope persist across pooled transactions.
- Do not change `/v1/accounts` or `/v1/account-context/*` from HTTP 503 until
  live identity/session stores, RLS, atomic rotation, CSRF, append-only audit,
  retries and device QA have independent acceptance evidence.
- Do not treat a synthetic SQL CI fixture as proof of live tenant isolation.
- Do not grant the legacy reader role; migration 013 denial stays intact.

## Verification

Two separate source workflows verify Node adapter failure handling and PostgreSQL
16 RLS against a disposable container. Batch 22's SQL fixtures are explicitly
separated from the pre-existing database test suite to prevent synthetic account
UUID collisions. CI and migration inventory are source acceptance only.

## Open decisions before deployment

The CTO/Security/Release offices must verify current Pages exposure and contain any
public backend artifacts, determine a restricted deployer identity, select a proper
PostgreSQL hosting and secrets approach, approve role-to-login mapping, confirm
session rotation/replay/durable audit implementation, and complete regulated
UK–Nigeria provider due diligence. No live Business switch, payment or wallet read
is authorised by this ADR.
