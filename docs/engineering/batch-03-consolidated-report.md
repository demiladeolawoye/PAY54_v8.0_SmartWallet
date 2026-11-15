# PAY54 Enterprise Engineering Office — Batch 03 Consolidated Implementation Report

**Date:** 2026-11-15  
**Branch:** `project-titan`  
**Baseline:** `59b7d549bf1fdbed46c025194bc57b26dc0ccde9`  
**Approved scope:** Implementations 32–46; source-only Personal/Business account security, wallet ownership lifecycle, read eligibility and negative regressions  
**Outcome:** 15/15 SOURCE DELIVERABLES COMMITTED; TESTED IN EPHEMERAL CI; LIVE DEPLOYMENT NOT AUTHORISED  
**Cloud provisioning:** DISABLED; **Financial execution:** DISABLED; **Staging/production release:** BLOCKED

## Executive assessment

This batch hardens the read-only account/wallet foundation without activating Personal/Business banking or changing existing financial posting behavior. It prohibits reassignment of owner subject on **explicitly bound** personal wallets and requires currently verified account, membership and wallet state for read eligibility. It also adds a security-invoker PostgreSQL view, parameterized wallet identity read adapter, hardened HTTP request boundaries and constrained trusted session time claims. The profile switcher remains unmounted/non-operational.

## Delivery and GitHub commit evidence

| # | Delivered | Commit(s) |
|---|---|---|
| 32 | Migration 010: guard bound wallet owner immutability | `8c0e4919f4519977ff45cafef7c71bcf6a230f77` |
| 33 | Migration 010 negative owner/revocation SQL tests | `282964140b5e23167b637abab95b87b3222bb9b6` |
| 34 | Ephemeral PostgreSQL lifecycle CI gate | `90ac43005e677f07b8fc42b623f2d255510bdabc` |
| 35 | Current owner/account/membership/wallet binding eligibility policy | `732290a462222d9b18f1561c3db9c028eeb0a71b` |
| 36 | Read eligibility revocation, suspension and cross-account tests | `c4cc7266876bab76a78432b9d140ef4d7eecf95d` |
| 37 | Parameterized account-scoped read-only wallet ID repository | `7749594bb2784fb0b5f1ad1d1a7cf2c063c5fb16` |
| 38 | Wallet reader forged-row, cross-account, duplication and unauthenticated tests | `e448adfec253f433884e1fa31c1fa2857283cab1` |
| 39 | Reject malformed/oversized URL targets and normalization bypasses | `9dfae33e4fb940d621eeac5d32986c336c80e4e9`, `8f77ca500019fe60ab227faef7d2a39d4c687cb7`, `b943b46bfd456244ce95717cc257dcae72725949` |
| 40 | HTTP request-path and no-DB-access negative tests | `11b9f5df1d81ba5e22d7c1c2b2794b6c4606316b` |
| 41 | Verified session expiry and optional temporal claim boundaries | `d7171ca6f8565b3b43efb30a58bd3a11af2f899e` |
| 42 | Session timeout, not-before and future-issue regression tests | `4cd8e8930221ac117a06d131cccd00090c388172` |
| 43 | Migration 011: read-only security-invoker current-eligibility view | `4b05e91d7513af8b80abe046307991c4488b2ebe` |
| 44 | Migration 011 revocation/suspension/role-isolation SQL tests | `6deb9e1a9cb55848174052da4213ea856f4161c6` |
| 45 | Integrated PostgreSQL+Node source-only CI gate and source security review | `4b847464251ebf5c036a6ea52f0c3007231bccbf`, `9cb7b06740643d9019a6e56234c72c2da9fd6306` |
| 46 | Consolidated report, tracker closure and approval stop gate | This report and Batch 03 tracker closure |

## Verified CI evidence

| Workflow | GitHub Actions run | Outcome |
|---|---|---|
| PAY54 Wallet Ownership Lifecycle Tests | `43748911665` | **SUCCESS**; ephemeral PostgreSQL 16, migration 010 and legacy isolation |
| PAY54 Backend Tests | `43749252598` | **SUCCESS**, backend suite on commit `6deb9e1a9cb55848174052da4213ea856f4161c6` |
| PAY54 Account Boundary Tests | `43749198367` | **SUCCESS**, targeted account and session tests |
| PAY54 Account Security Integration | `43749292611` | **SUCCESS**; migrations 001–011, account+ledger SQL tests, Node tests and disabled-mode assertions |

The integrated workflow's individual steps **all** concluded successfully. Cancellation of intermediate workflows from successive commits is not reported as a test pass and is retained in GitHub history. The final documentation commits do not themselves alter tested runtime code.

## Compatibility and safety

- Financial migrations 001–009, ledger entries, balance reservations, posting functions, existing wallet schema and dashboard UI were **not changed** in Batch 03.
- Migration 010 will apply extra restrictions to **bound** wallets only, should it ever receive live deployment approval. Unbound wallet behavior and existing wallet suspension remain unchanged.
- Migration 011 adds a view, not a materialized balance, and grants no reader role. New code is unmounted and has no connection to a live identity, payment or database service.
- Personal/Business account balances are **not** implemented as an activated user-facing feature; no business wallet associations or customer onboarding exist.
- All new synthetic SQL records are rolled back within disposable PostgreSQL CI. No production database migration was run by this work.
- Cloud VPC, runtime network IAM, real-money mode, billing and staging/production provisioning remain outside batch authority.

## Open architectural and security risks

1. A real trusted session verifier is still absent; signing, issuer/audience checks, revocation/replay resistance, CSRF, device context and audit events require separate design.
2. Backend PostgreSQL restricted-role, RLS policy, connection-pool identity and privilege grants still require an independently reviewed least-privilege implementation; a security-invoker view alone grants nothing.
3. Membership revocation is accepted while an immutable historical wallet binding remains. Future financial reads/writes **must** require current authorisation and must not use the existence of a binding as permission.
4. Binding owner immutability relies on ordinary PostgreSQL trigger enforcement. Privileged DDL bypass, concurrent transitions, operational migration rollback and recovery must be reviewed prior to live use.
5. Full browser and mobile account-switch accessibility, cache isolation, account-specific data refresh and real business KYB/provider obligations are not implemented or verified.
6. No independent Google Cloud STG-05 or release-gate approvals were obtained. Source CI is not cloud attestation.

## Recommendation for implementation 47

**Implementation 47 — Privileged database adapter and row-level security design review.** Build a separate source-only, least-privilege account read access contract and negative database role tests, including connection-pool cross-request isolation, reviewer-only role design and no bypass-RLS privileges. Do **not** mount a live HTTP endpoint, add account-creation permissions or enable money execution without separate approvals.

**STOP:** User-approved Batch 03 concludes at item 46. Implementation 47 requires explicit new approval.

## Decision classification

**BATCH_03_SOURCE_COMPLETE; CI_PASS; STAGING_RELEASE_BLOCKED; CLOUD_PROVISIONING_DISABLED; FINANCIAL_EXECUTION_DISABLED; INDEPENDENT_RUNTIME_SIGNOFF_OUTSTANDING.**
