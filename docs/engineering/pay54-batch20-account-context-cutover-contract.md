# PAY54 Batch 20 — Secure Personal/Business Context Cutover Contract

**Implementation 764** · **Founder-approved CR-ACCOUNT-02** · **Status: BACKEND CUTOVER NOT ACTIVATED**

## What actually exists in this review branch

The new dashboard renders a Personal account selector only when the current presentation-layer session check reports authenticated. Business is visibly marked unavailable. A synthetic Chromium visual run demonstrates display/layout only and must not be interpreted as a live authenticated Business account or real banking feature.

The foundation backend at `backend/src/server.mjs` has health and fail-closed financial routes, **not** a trusted principal directory, live session authority, PostgreSQL-connected membership store or tenant-bound money-read service. It now returns **503 ACCOUNT_CONTEXT_SERVICE_UNAVAILABLE** for `/v1/accounts`, `/v1/account-context` and `/v1/account-context/*`, with no-store responses and a correlation identifier. It does not accept client-provided account identifiers as authorisation.

## Canonical architecture and service contracts

The existing `backend/domain/account-model.mjs`, `account-membership.mjs` and `account-ledger-boundary.mjs` remain the single business-authorisation domain rules. Their established roles are PERSONAL_OWNER, BUSINESS_OWNER, BUSINESS_ADMIN, BUSINESS_OPERATOR and BUSINESS_VIEWER. A Business viewer is not authorised to initiate or approve payments.

New pure source modules implement three nonexecuting stages:

| Stage | File | Guarantees and remaining backend dependency |
| --- | --- | --- |
| Authorisation proposal | `backend/domain/account-context-selection.mjs` | Canonical account and active membership; matching authenticated principal and target account; read authority only. **Must be supplied from authoritative server storage.** |
| Session rebind preflight | `backend/domain/account-context-rebind.mjs` | Matching principal, active unexpired session, authoritative version comparison, no-op refusal; requires future atomic CAS, fresh session/CSRF binding, old-session revocation, trusted RLS reset and audit. **Does not issue tokens or mutate a session.** |
| Account-scoped refresh plan | `backend/domain/account-context-cache-plan.mjs` | Identifies wallets, balances, transactions, cards, payment sources, recipients, activity, permissions, dashboard feed and beneficiaries; requires cancelling old in-flight requests and verified new-account reads. **Does not clear a cache or transfer funds.** |

The transition cannot be made functional by merely changing the browser label or persisting a selected account ID in localStorage/sessionStorage.

## Production acceptance required before enabling selection

1. **Trusted identity:** Verify authenticated principal from the established backend session; reject anonymous, impersonated, revoked or expired tokens; bind actor identity to an approved device/session and support logout.
2. **Membership:** Load accounts and memberships from server-owned records in a privilege-restricted transaction. Enforce account status, verified KYC/KYB, role, suspended/revoked memberships, business ownership, and the canonical domain policy.
3. **CSRF and concurrency:** Apply a strict origin and CSRF policy, one-time session rotation, monotonic session generation, atomic compare-and-swap, anti-replay checks and an auditable transition record. Do not place session tokens in URL queries.
4. **Database isolation:** Enforce PostgreSQL RLS and explicit tenant/account scope in every query and write; verify Personal→Business→Personal, deep-link manipulation and concurrent requests cannot leak balances, cards or transactions.
5. **Cache and UI:** Abort old in-flight requests; clear all ten account-scoped cache domains; re-fetch from authenticated, account-bound APIs only. Show a loading state until the server-confirmed account is ready; on denial, preserve the previous verified context without showing a false success.
6. **Payments:** Keep payment issuance, FX, ledger posting, card funding and transfers separately permissioned and disabled unless contracted providers, reconciliation and regulated-money launch controls are independently approved. A valid account view is not money authorisation.
7. **Operations:** Include independent QA and Security sign-off, release-SHA-specific browser/mobile/accessibility evidence, rate limiting, audit retention, monitoring, rollback, threat modelling and signed partner/compliance records.

## Browser contract

The account selector is a **read-only identity context presentation**. Personal is marked active only when the session manager reports authentication; Business is unavailable until a trusted backend provides separately authorised accounts. The selector must not submit an account switch, mutate wallet/card/ledger state, manufacture Business eligibility, or show cached financial data from a different account.

## Current test coverage

- `account-batch20-context-selection.test.mjs`: personal/business view authorisation, wrong principal, forged role, suspended membership, invalid descriptor.
- `account-batch20-context-rebind.test.mjs`: expired/revoked session, replay/stale generation, identical account, forged proposal.
- `account-batch20-context-cache-plan.test.mjs`: ten-domain cache refresh, source/destination mismatch, strictly nonexecuting result.
- `account-batch20-context-http-denial.test.mjs`: actual loopback backend HTTP refusal, no-store/correlation headers, original health and financial denial invariants.
- `account-batch20-context-integration.test.mjs`: across-stage proposal and frontend/backend NO-GO.
- Original account membership, actor/RLS and authentication regression workflows remain required.

## Production release blockers

The historical GitHub Pages artifact overincluded internal source. Its current public reachability and data sensitivity remain unverified. The actual public site still contains a script reference to a development-only linked-card provider excluded by the approved public manifest. Protected deployment controls, safe rollback, independent browser acceptance, contract/regulated launch authorisation and live tenant isolation are not accepted.

**CTO disposition: NO-GO.** The review branch and draft PR must stay unmerged. No Pages setting, credentials, user account, PostgreSQL grant, payment provider, real-money mode or production site has been changed by this work.
