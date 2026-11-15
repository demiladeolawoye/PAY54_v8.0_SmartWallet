# PAY54 EEO — Batch 03 Account and Wallet Security Review

**Date:** 2026-11-15  
**Repository branch:** `project-titan`  
**Engineering scope:** Approved implementations 32–45  
**Classification:** Source implementation and disposable CI review, **not** an independent security sign-off  
**Cloud provisioning:** DISABLED; **Financial execution:** DISABLED; **Staging/production release:** BLOCKED

## 1. Source-controlled security improvements

1. Migration `010_wallet_binding_lifecycle_guard.sql` adds a trigger to prevent reassigning `wallets.owner_subject` on a legacy wallet linked by `personal_wallet_bindings`. Existing unbound wallets preserve their earlier behavior. The source does not create any wallet or binding.
2. Migration `011_wallet_eligibility_view.sql` creates `eligible_personal_wallet_bindings` with `security_invoker=true` and `security_barrier=true`, joining account, membership, wallet and binding. Eligibility disappears if an account or wallet is suspended or if the owner's membership is revoked. This is a read-only account/wallet-ID view: it does **not** calculate balance or spendable funds.
3. All new relations and view retain the existing deny-by-default role posture. No application, auditor, executor or PUBLIC account-read permissions are introduced by this batch; no RLS policy grants are made.
4. `account-wallet-eligibility.mjs` and `account-wallet-reader.mjs` perform additional application-level eligibility checks, including expected account identity and principal, current status, owner matching, binding relationship and duplicate rejection. They are unmounted read-only modules without a live database adapter or financial posting.
5. `account-context-handler.mjs` rejects malformed and oversized HTTP targets, percent-encoded paths, query strings and path traversal before querying a store. There is still **no** live HTTP route mounting.
6. `trusted-account-principal.mjs` rejects server sessions that are expired, excessively long-lived or contain invalid optional issuance/not-before claims. Session cryptographic verification, rotation and revocation remain responsibilities of a separately supplied verifier.

## 2. Residual threat model

| Risk | Current posture | Required follow-up |
| --- | --- | --- |
| Login/session impersonation | Server-verified principal dependency required, but no deployed verifier | Design and independently test signed session/issuer/audience/replay/revocation controls |
| Database privilege / RLS bypass | Forced RLS on new account tables; no grants; view security-invoker | Review actual login role, query adapter, superuser/BYPASSRLS exclusion, pool isolation and live policies |
| Stale binding after revoked membership | Membership and account/wallet statuses rechecked on every eligibility read | Confirm all future endpoints reuse this policy and provide atomic financial authorization |
| Wallet owner reassignment after linking | Migration 010 trigger blocks changes for bound wallets | Validate privileged DDL protections, concurrent mutations, role access and controlled recovery process |
| Business account wallet isolation | No business wallet association implemented | Separate KYB, ownership, business finance and delegate authorization design |
| Access logging and request flood | No live account API; no new listener | Rate limits, audit logging, incident controls and HTTP runtime testing before route activation |
| Monetary operation bypass | No new posting, ledger grants or real-money mode | Independent payment-security review and release gates |
| Cloud network enforcement | Unchanged, unverified source-only STG-05 | Independent authenticated cloud evidence and sign-offs |

## 3. Negative test evidence scope

- `backend/db/tests/010_wallet_binding_lifecycle_guard.sql`: bound owner mutation denied, unbound legacy behavior retained, membership revocation succeeds and synthetic records rollback.
- `backend/db/tests/011_wallet_eligibility_view.sql`: account, membership and wallet lifecycle changes remove eligibility and SQL fixtures rollback.
- `backend/tests/account-wallet-eligibility.test.mjs`: revocation, suspension, owner mismatch, business account and inconsistent binding denied.
- `backend/tests/account-wallet-reader.test.mjs`: forged query rows, cross-account mismatch, duplicates, missing authentication and oversize store outputs fail closed.
- `backend/tests/account-context-handler.test.mjs`: invalid request paths rejected before database access; unrelated routes unaffected.
- `backend/tests/trusted-account-principal.test.mjs`: session expiry, revocation and optional temporal constraints tested.
- `.github/workflows/pay54-account-security-integration.yml`: disposable PostgreSQL 16, migrations 001–011, legacy financial access tests and Node account checks. The workflow must complete successfully before Batch 03 testing may be marked passed.

These checks provide source/CI evidence, not live penetration tests or financial authorization.

## 4. Existing behavior and compatibility

The source changes do not edit financial migrations 001–009, immutable ledger postings, balance reservation operations, wallet transfer execution services or the displayed dashboard account switcher. No existing user wallet is automatically bound. Restricting owner mutation applies **only** to explicitly bound wallets in a future schema deployment, which requires separate migration approval and production impact analysis.

## 5. Required approval boundary

No PostgreSQL migration has been applied to a PAY54 live environment. No Google Cloud provisioning, IAM, third-party provider enablement, account creation, money movement, financial-mode activation or production deployment is authorized.

**Independent security approval:** OUTSTANDING. **Batch closure:** contingent on final CI results and consolidated report.
