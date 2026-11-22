# PAY54 Batch 31 — Authenticated Wallet Read Integration Contracts

## Source baseline

Protected `project-titan` is verified at PR #70 merge commit `820891f10f0939a116271ff2f0e374714ddda9be`.

## Implemented components

**Server service**: `backend/src/authenticated-wallet-balance-read.mjs` composes existing `planPay54AccountWalletRead` and `validatePay54AccountReadContinuity`. A trusted authority must return an authenticated session, account, membership, wallet, journal and server timestamp. Only the account from that authority is eligible, never a browser-supplied owner. A separately approved read-only PostgreSQL service must bind the actor and RLS for each read.

The new service strictly validates a single currency/balance row, wallet/account ownership, a nonnegative decimal *minor-unit string* (to avoid JS money rounding), currency code and ledger revision. After the asynchronous read it obtains a fresh authority snapshot, reruns eligibility and checks session identity, account, wallet, journal and version continuity. Failure returns only a generic error and never leaks balances.

**Browser presenter**: `assets/js/dashboard/wallet-balance-presenter.mjs` composes the existing `account-read-coordinator.mjs`. It accepts a separately injected authenticated transport and a synchronous, separately injected renderer, rejects malformed and other-account response envelopes, clears existing displayed data on failure, and prevents an older account's response being rendered after a switch or logout.

## Important security distinctions

1. A JSON field cannot authenticate a database connection or prove the user is the account owner. The backend trusted-authority and database reader dependencies are **interfaces**, not live verified providers. The flags from a mocked test adapter are not operational proof.
2. This PR creates **no HTTP listener, new network endpoint, authenticated production API transport, managed PostgreSQL pool, SQL grant or migration**. The service and presenter remain unmounted; the demonstration dashboard continues unchanged.
3. Real balances cannot safely be derived from browser `localStorage` or demonstration `PAY54_LEDGER`. An approved ledger, account-isolated PostgreSQL RLS policy, transaction role, reconciliation and revision provenance must precede enabling a customer read.
4. `availableMinor` is a nonnegative integer string. If negative accounting positions are required, that should be a separately audited business contract. Do not format balances by coercing to floating-point Number.
5. The frontend integration must use HTTPS, same-origin authorised endpoints, safe session cookies and CSRF-aware transport. Browser account selection by itself never grants a new account context. Correct DOM clearing, screen reader announcements, keyboard operation, mobile layout and real device acceptance require a later reviewed integration.

## Regression and scope

The existing dashboard CI now checks backend owner/session/wallet admission, revocation and account-switch races, malformed cross-tenant wallet rows, zero balance, integer minor units, presenter stale-request cancellation, and legacy dashboard balance truthfulness.

All new code preserves existing modules and public scripts. Server and browser components are opt-in and display-only, with no transfer, payment, card-funding or production grant.

## Readiness dependencies

- Cloud/provider identity and credential custody: no persistent staging approval.
- Real Postgres read-only role, tenant-scoped RLS and authenticated backend route: not connected here.
- Ledger settlement, reconciliation and authoritative balance revision: unverified.
- Protected Pages site publication, full browser QA, UK–Nigeria regulated partners: tracked independently in the Batch 29 release blocker register.

**Release decision: source-only protected integration after exact CI and independent review; persistent staging and production remain NO-GO.**
