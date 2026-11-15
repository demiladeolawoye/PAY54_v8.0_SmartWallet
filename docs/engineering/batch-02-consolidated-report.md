# PAY54 Enterprise Engineering Office — Batch 02 Consolidated Report

**Date:** 2026-11-15  
**Branch:** `project-titan`  
**Baseline:** `177831bafadba16ce4b116ad92997489edb113a9`  
**Scope:** Implementations 17–31; source-only Personal/Business identity, account views, permission checks, personal wallet association and regression protection  
**Decision:** BATCH_02_SOURCE_COMPLETE — IMPLEMENTATION_32_REQUIRES_NEW_APPROVAL  
**Production release:** BLOCKED  
**Google Cloud provisioning:** DISABLED  
**Financial execution:** DISABLED

## 1. Delivery summary

15/15 approved deliverables are committed. No existing ledger migration 001–008, posting logic, wallet table schema, hosting deployment code or live production configuration was changed. This batch builds unmounted read-only API and future account-switching foundations; it **does not** create a functioning Personal/Business account feature for customers.

| # | Artifact | Commit |
| --- | --- | --- |
| 17 | Trusted server-authenticated principal adapter | `f8ea2751324149279986dc7c2d52ad28ef487b11` |
| 18 | Negative authentication and expiry/revocation tests | `bbfc4992e840b7c23d75ce6b90918250e0674081` |
| 19 | Unmounted read-only account-context handler | `6e3bf3b8e8d2075aec20966c32ae2391c8ea53e5` |
| 20 | Unauthenticated access, method, disclosure and error tests | `509b996ce562ee774beff915c977429ef4acc831` |
| 21 | Minimal account picker projection | `487744bae45e9b563642e9dce0d45ad58275997c` |
| 22 | Sensitive-field exclusion and list-bound tests | `c8c2eb0fd5289a6b2295378867e2d3a1d9e15da7` |
| 23 | Operation eligibility and maker/checker guard | `68af24b49cd957e7de2c2dc68a2455da6855265e`; hardened `29b493594113afaef23bc7d5f6b4ceb484791176` |
| 24 | Permission and maker/checker tests | `ea7a060bf258e3f59aedde123f01ea5f71d68886`; expanded `951282e37e3b2c05bc7c125cc8de48bf2f63337b` |
| 25 | Source-only migration 009, immutable Personal legacy wallet binding | `75ed0249e8074860b80072548079193a145b4e6d` |
| 26 | Rollback-only SQL owner/role/reassignment negative tests | `029159a76c3f071eb6176f66f60e0ee4002f1684` |
| 27 | Ephemeral PostgreSQL 16 CI gate for migration 009 | `c4d3e949c75ed6a3d79c3d05928d1123b3c56fe3` |
| 28 | Stateless, non-activating account selection intent | `877785a2f2de3a4d8271b641176b767cba4df75e` |
| 29 | Keyboard selection and no-execution regression tests | `ff36fa58b2cd7e58580b3a4a5d0c56e78555507e` |
| 30 | Detailed source-level account security and deployment review | `d785825d72c7ed6c622c27473418cb0958961bfb` |
| 31 | This consolidated report and completed approval tracker | Report and ledger commits at batch close |

Additional CI assurance: `.github/workflows/pay54-account-boundary-tests.yml` commit `2c9091b4bd15f69c68148b75a36aceb2fc19e55f` runs focused account-domain JavaScript regression checks independently of the broad backend workflow.

## 2. Verified GitHub Actions results

| Workflow | Run | Conclusion |
| --- | --- | --- |
| PAY54 Backend Tests | `43747308208` | **SUCCESS** at `951282e37e3b2c05bc7c125cc8de48bf2f63337b` |
| PAY54 Account Boundary Tests | `43747463142` | **SUCCESS** at `2c9091b4bd15f69c68148b75a36aceb2fc19e55f` |
| PAY54 Account Wallet Binding Isolation | `43747099899` | **SUCCESS** at `c4d3e949c75ed6a3d79c3d05928d1123b3c56fe3` |
| Pre-existing PostgreSQL Ledger Tests | `43747066066` | SUCCESS, earlier migration 009 test-source commit |
| Pre-existing Database Role Isolation | `43747066106` | SUCCESS, earlier migration 009 test-source commit |
| Pre-existing Direct Ledger Access Boundary | `43747066059` | SUCCESS, earlier migration 009 test-source commit |
| Pre-existing Database Security Tests | `43747066113` | SUCCESS, earlier migration 009 test-source commit |
| Pre-existing Capture/Release Concurrency | `43747066086` | SUCCESS, earlier migration 009 test-source commit |

Some intermediate backend runs were cancelled by GitHub workflow concurrency while commits continued; the final full backend and the independent focused test workflow both completed successfully. GitHub Pages build and deployment is independent of staging infrastructure or live financial functionality.

## 3. Security and compatibility conclusions

- **Server identity:** Future integration must supply a real verified session adapter; browser identity claims cannot be treated as authenticated.
- **Account API:** No backend route is mounted or listening. The handler performs read-only account listing/selection, parameterised database queries, post-fetch account ownership checks and minimum disclosure.
- **Operation policy:** A positive membership/operation decision can never enable financial execution. An initiator cannot approve the same operation, and malformed initiator UUIDs fail closed.
- **Wallet association:** A new separate table can relate an existing legacy wallet to an eligible verified PERSONAL account with the same legal owner. No existing wallet is copied, reassigned, inserted or automatically bound. A business-owned wallet design remains outside this scope.
- **Database security:** Both account context and binding schemas use forced RLS and have no new grants to existing restricted roles or PUBLIC. Migrations 008–009 were exercised only in disposable PostgreSQL GitHub Actions.
- **Client UX:** The account picker state machine supports keyboard navigation and emits an untrusted **request intent**, never an authorised live account switch. Actual focus management, accessibility announcements and mobile testing are future work.

## 4. Open risks and required independent approval

1. The migration 009 owner-match check is evaluated on insertion. Additional cross-table invariants are needed to prevent legacy wallet-owner changes or membership revocation from leaving a stale binding.
2. No login role or RLS policy grants account-context access; the read API must not be wired until the DB privilege and pool-identity model is reviewed.
3. No actual session verifier, session revocation service, audit trail, rate limit, KYC/KYB provider, business membership delegation or regulated account onboarding has been connected.
4. The source-reviewed handler is not mounted; no claim of customer-facing account switching or business wallet activation is appropriate.
5. Google Cloud STG-05 and STG-01..STG-07 independent operational approval remain outstanding; cloud provisioning and production release stay blocked.
6. Prior approval covers no monetary posting, real payment, provider credential or IAM action.

## 5. Recommendation for implementation 32

**Implementation 32 — Wallet/account ownership lifecycle invariant hardening:** build a separate source-only PostgreSQL migration and negative tests that prevent changing the owner subject of a wallet already bound to an account and prevent unsafe stale bindings after membership/account lifecycle events. Evaluate lock ordering and concurrency deadlocks, preserve existing financial ledgers and test rollback in disposable PostgreSQL only. No live migration or deployment without an additional explicit decision.

**STOP:** Batch 02 authority is exhausted at item 31. The next engineering implementation requires new approval.

## 6. Final signoff classification

**ENGINEERING SOURCE AND CI COMPLETE; RUNTIME AND REGULATORY APPROVALS OUTSTANDING; NOT PRODUCTION READY.**
