# PAY54 CTO — Batch 21 Source Engineering Closure

**Cycle:** 768–817 (50 source deliverables, including focused regression/CI/governance changes)
**PR:** #9 — DRAFT, based on unmerged Batch 20 PR #8
**Scope:** Account directory, secure context-read/switch prerequisites and independent release governance
**Operational outcome:** NO-GO — no actual Personal/Business switching, real PostgreSQL RLS, customer identity integration or production payment service

## What has been delivered

| Range | Engineering result |
| --- | --- |
| 768–773 | Canonical membership-filtered account directory, adversarial actor tests, trusted service composition and first pinned CI/governance register |
| 774–779 | Expiry/versioned read-session preflight, service checks and account-directory integration regression |
| 780–785 | Read-only tenant-scoped repository transaction boundary and fake-RLS/actor-denial testing; no real DB connected |
| 786–788 | Frozen, detached account and membership record snapshots and malformed row rejection |
| 789–793 | Time-of-check/time-of-use continuity fence; revalidate trusted session after async repository read; revoked/rotated session regression |
| 794–799 | Session active-account view gating and canonical wallet/journal financial read admission; strict nonexecution |
| 800–805 | Strict untrusted switch-request parser, same-origin and timing-safe CSRF preflight, composite membership/authoritative-session rebind admission and adversarial tests |
| 806–811 | Redacted precommit audit intent, ten-domain cache transition evidence and independent cutover-claim gate; no fabricated success |
| 812–814 | Actual loopback 503 HTTP refusal tests, no financial/session side-effect tests, expanded pinned read-only CI |
| 815–817 | Founder change request register, closure documentation and final task-board reconciliation |

## Deliberately not implemented

- No browser business-account switch, no server account-switch endpoint and no live account directory endpoint.
- No database schema migration, PostgreSQL connection, privileged SQL/RLS transaction, customer data, live KYC/KYB or active account membership store.
- No issued token, cookie, CSRF credential, one-time nonce consumption, durable audit event, transaction commit or card/ledger mutation.
- No GitHub Pages publish, settings change, deployer IAM, branch merge, financial production or provider activation.
- No unverified claim that a caller-supplied RLS flag means database isolation exists.

The existing foundation route `/v1/accounts` and `/v1/account-context/*` remains deliberately HTTP 503 with no-store. Read contract success cannot authorise any money movement.

## Exact-SHA CI acceptance

The new `.github/workflows/pay54-batch21-account-directory.yml` uses pinned read-only GitHub Actions, Node 24 syntax checks, all `account-batch21-*.test.mjs` tests, and retained Batch 20 selection/rebind/cache-plan tests. Existing account security, RLS, actor, catalogue and boundary checks remain required.

**Final-SHA results must be reconciled after implementation 817 commits.** Previous passed or cancelled runs are not acceptable evidence of a later commit. Any failing assertion must be fixed before declaring a successful batch closure.

## Founder decisions and next steps

1. Independently review PR #9 and the 50-item implementation evidence. Leave it DRAFT/unmerged.
2. Resolve historical Pages P0 using current active deployment evidence and an approved containment/rollback decision; archived artifact evidence alone does not establish public reachability or compromise.
3. Choose linked-card production provider or authorised disabled preview without breaking wallet funding.
4. Provision genuine restricted PostgreSQL store, identity/session authority and least-privilege deployment infrastructure before enabling read or switch routes.
5. Require real tenant RLS and concurrency tests, mobile/desktop accessibility, full wallet/card/ledger regression, operational review and Founder/Security/Release approval.

**CTO release disposition: NO-GO, independent review required.**
