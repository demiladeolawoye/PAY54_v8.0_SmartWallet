# PAY54 Batch 47 — Authenticated Financial Command Preflight (Source Only)

24 November 2026. Protected baseline `project-titan`. **DO NOT ACTIVATE OR DEPLOY.**

## Implemented
An unmounted Node ES module `backend/src/financial-command-preflight.mjs` creates strictly non-executable evidence for a wallet-transfer reservation proposal. The module reuses the existing hardened bearer extraction and SHA-256 digest utility. Trusted injected server-side resolvers must establish the active authenticated session, RLS-confirmed personal account owner and source/destination wallet scope. A fresh committed session fence is required, and both session and scope are rechecked for drift. The module creates a SHA-256 fingerprint over canonical instruction and verified session/scope, but never returns a token, DB role, SQL command or authorisation to transact.

Negative tests cover invalid account binding, amount in minor units including signed BIGINT boundary, idempotency data, missing bearer, account switches, session revocation, scope drift and forged fresh fence.

## Deliberate boundaries
- This module **does not use a database connection or call financial procedures**. Injected resolvers are trust dependencies and mocks in CI; syntactically valid objects do not establish real IAM or RLS.
- A digest/fingerprint is not a digital signature or anti-replay authorisation. The provided request digest is shape-checked but **not computed from a trusted canonical request body**; canonical digest generation and durable idempotency reservation belong to an independently reviewed executor.
- The fresh committed session check is non-atomic relative to subsequent revocation. Before money execution, introduce an authenticated, transactional authorisation barrier and precise state-change consistency semantics.
- No positive restricted-writer reserve/capture/release operation is verified by this batch. Existing financial procedures remain SECURITY INVOKER; proposed FORCE RLS may affect legitimate writer execution.
- Never equate booked/posted wallet amounts with provider-settled funds or approved customer available balances.

## Pending admission
Actual non-superuser wallet writer contract, trusted identity attestation, restrictive write policies, row-lock/trigger correctness, concurrency, paid Cloud SQL GBP quote and signed financial/security release approval. Existing draft PRs #81–#86 must be reconciled in the protected integration branch before staging admission.

**Staging NO-GO. Production NO-GO. Spending NOT AUTHORISED.**
