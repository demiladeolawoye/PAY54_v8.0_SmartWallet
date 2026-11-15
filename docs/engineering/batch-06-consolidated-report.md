# PAY54 Enterprise Engineering Office — Batch 06 Consolidated Implementation Report

**Report date:** 2026-11-15  
**Branch:** `project-titan`  
**Baseline:** `fda52344969dc73389ed48fe0aad4ca1586ef261`  
**Authorisation:** Batch 06, implementations 92–121, source-only security and engineering  
**Decision:** 30/30 SOURCE DELIVERABLES COMMITTED; RELEVANT CI SUCCESS  
**Live PostgreSQL:** UNCHANGED · **Cloud provisioning:** DISABLED · **Financial execution:** DISABLED · **Staging/production release:** BLOCKED

## 1. Executive summary

Batch 06 delivers a source-only pinned Ed25519 signed-session verifier, a trusted-principal adapter and revocation boundary, explicit PostgreSQL restrictive deny-only account RLS policies, cross-account membership checks, minimal account-response and audit correlation contracts, browser-origin and capability controls, negative tests and an integrated CI workflow. The work preserves existing financial ledger and wallet posting behavior. The approved project has **no live authenticated account endpoint, new database login/grant, actual customer session infrastructure or customer-facing Personal/Business switcher**.

None of these source commits activates KYC/KYB, wallet funding, payments, external provider infrastructure, cloud access, or regulated activity.

## 2. Implementation evidence

| # | Deliverable | Commit |
|---|---|---|
| 92 | Account RLS and authenticated-session threat model | `fcfcbdec543f0b59b8b995f908cb945e985319bf` |
| 93 | Migration 013, restrictive false account SELECT policies with no new grants | `4f6d1f77a9562a097dcece843d801481271f9024` |
| 94 | RLS denial and restricted-role SQL negative tests | `3527891c9555ac152eb0c9eb73e2313903a30eb0`; correction `916cf638fa537ba6617c6e6e321a8981639c78f2` |
| 95 | Disposable PostgreSQL RLS security workflow | `27ad8712ee9872941c6f175e51053748026990dd` |
| 96 | Pinned Ed25519 compact JWS verification | `395d21a1b51a7dc77e66ee7c2368ca9b08b7282b` |
| 97 | Signed issuer/audience/signature/expiry/revocation negative tests | `ff05e86022bbd5cda68f85860584b3c8cbadab72` |
| 98 | Signed-session to opaque trusted-principal adapter | `18b22b873f37700fd07ca306fbb6c7246cd3b084` |
| 99 | Verified-principal adapter and fail-closed tests | `641c2ac5be22596e1591ea062602429c84885780` |
| 100 | Pinned trust key and active/retired key policy | `192bcfbe9999cf813ba9dd19ebb0d74fb834cb4e` |
| 101 | Algorithm confusion, malformed and retired key tests | `1256a90c3fb7c4cbd19f71278e3c9744a14f7936` |
| 102 | Fail-closed backend session revocation guard | `cde528afd66103576fe5ca27ada281602c9d67f6` |
| 103 | Revocation outage, stale token and malformed JTI tests | `fd854cb1e31f90e740f96a9994a83a9980dbb062` |
| 104 | Offline RLS deny-source auditor | `03ad6cc93cbba55abb2802ee2da1e1acc8d2675c`; correction `1cc8efc34de6ffccbcb0a0bab5c0d0776f331b7f` |
| 105 | Policy mutation and source-denial regression tests | `a700588133528d596f6d38b514c407464e579d16` |
| 106 | Account-specific tenant membership disclosure boundary | `0495588ed72b1df6506c8c319a2e05469d2d8a2a` |
| 107 | Cross-account, revoked and suspended negative tests | `9aafe851d1e6c3f26969bb27ab42946c70e78aef` |
| 108 | Read-only minimal account response envelope | `a428f4469e80ac0cb533c3051ffd33b0e8fd6d88` |
| 109 | Response PII minimisation and malformed-list tests | `fd3c48e25c87494fae2876931e0f901ba00ef940` |
| 110 | Generated non-PII audit request correlation | `52cbad55921362424d9d2d35a560368e1f22904c` |
| 111 | Audit redaction and invalid correlation regression tests | `00ec0ffd4aeeeb82baa06946f6aa5cabe106dd30` |
| 112 | Strict HTTPS browser-account Origin/Fetch-Site policy | `da8260136d750e08143bb45c4e9495961a40ad2b` |
| 113 | CSRF-origin spoofing and configuration negative tests | `5dd40ec7565d55a4d4a77dc1c619566da4711e5e` |
| 114 | Account membership capability read-only policy | `a195b6b2e9bc2511e28450f21bd4bf423f1ffeaf` |
| 115 | Role privilege and separation-of-duties tests | `3b38a353aeb781b98ed6ca6533a30c4be889763a` |
| 116 | End-to-end synthetic signed principal + account read isolation tests | `bc47b39c3ab34cdb274d4274a22ed3b707929323`; signature test correction `daad239241d13d344fec0e0f1d06e5806dd06a27` |
| 117 | Auth/RLS source security assessor | `d575f123d429541120adf1f40c0564453dc24dfb`; verification hardening `7c8d35479606467398b13313702184c17a4459d8`, `6e8666396e249e4f5b9b2fd6bc8badea0ef6c3c7`, `a344bc7a4340e6ceee0a3ee06759d9c69caaca41` |
| 118 | Authentication/RLS mutation tests | `671b40dff6339ca6485e883cda6d06e4dacafdb7`; corrections `eae006c9041514e605b36749717c5de570998000`, `30a05fa980033aa770edbea1edd61ab70226a4a1` |
| 119 | Integrated PostgreSQL 16 + Node authentication/RLS CI | `0693e44f1a056dc2f0a28a4b1bec8fd535fab662` |
| 120 | Source-only independent review and readiness packet | `74348404a6bdfa99652a8b51622af6cfdcad288d` |
| 121 | This consolidated report and completed Batch 06 approval ledger | Report and ledger closure commit |

## 3. CI test evidence

| GitHub Actions workflow | Run | Commit | Result |
|---|---|---|---|
| PAY54 Account Boundary Tests | `43771585648` | `30a05fa980033aa770edbea1edd61ab70226a4a1` | **SUCCESS** |
| PAY54 Backend Tests | `43771585535` | `30a05fa980033aa770edbea1edd61ab70226a4a1` | **SUCCESS** |
| PAY54 Account Authentication and RLS Integration | `43771585530` | `30a05fa980033aa770edbea1edd61ab70226a4a1` | **SUCCESS** |

Integrated CI applies migrations 001–013 only in disposable PostgreSQL 16, validates deny-only RLS policies and existing restricted-role/ledger tests, executes Node account authentication and isolation tests, and asserts that the cloud-provisioning and financial-execution environment flags remain false. The separate RLS workflow was created for source-specific future changes; the integrated run establishes passing RLS evidence.

### Intermediate defects and corrections

Intermediate workflows failed while this batch was being assembled. The RLS source auditor mistakenly interpreted the PostgreSQL catalogue field `rolbypassrls` as the forbidden `BYPASSRLS` role privilege; commit `1cc8efc3` corrected that false positive. An integration test's token mutation did not deterministically corrupt a signature; commit `daad2392` corrected the test. Source mutation checks initially accepted the presence of a `revocationGuard.check` or `verifyCompactJws` reference without demanding actual awaited invocation; commits `6e866639`, `a344bc7a`, `eae006c9`, `30a05fa9` tightened the assessor and tests. All three relevant final workflows finished successfully. Failed and superseded runs remain in GitHub history.

## 4. Trust and security boundaries

- The signed-session verifier requires a locally pinned ACTIVE Ed25519 key, exact EdDSA algorithm, issuer, audience, UUID subject and JTI, short expiration, typed issuance/not-before, cryptographic signature and an explicit fresh revocation check.
- No signing private key, login account or credential was committed by this batch; ephemeral keys in tests are generated dynamically.
- Migration 013 adds **restrictive false** SELECT policies to account context, membership and personal wallet binding tables. The dormant `pay54_account_reader_role` remains NOLOGIN, with no data grants or members. No trusted RLS tenant identity binding has been deployed.
- Account membership, origin, response, capability and audit contracts remain isolated/unmounted. Positive policy eligibility cannot enable real-money execution.
- The existing financial ledger, reservations, posting, wallet balances, cards and transaction engines were not modified.

## 5. Outstanding critical issues — not approved

1. No production signing-key custody, issuer verification, live token revocation store, logout/session rotation or independently attested login.
2. No safe production PostgreSQL account role/credential, server-authenticated tenant session, security-reviewed row-level SELECT policies or customer-data privileges. Caller-controlled custom PostgreSQL GUCs are **not** trusted for authentication.
3. No actual mounted Personal/Business account HTTP endpoint or real dashboard profile switch. No account creation, delegated business wallet, KYB or regulated payment provider integration.
4. No distributed throttling, browser CSRF token/cookie security, durable audit log sink, operational monitoring or penetration testing.
5. No independently witnessed Google Cloud STG-05 network/egress, STG-01..STG-07 governance, financial regulatory approval or release authorisation.
6. Passing source tests and disposable PostgreSQL workflows are not claims of live banking security or launch readiness.

## 6. Recommendation — Implementation 122

Before allowing any live account reads, design a separately reviewed **database-authorised tenant identity binding** that cannot be spoofed by SQL clients or connection-pool reuse, with explicit minimal role privileges and cross-tenant denial tests. Keep migrations and all new account data-access privileges source-only until an independent security reviewer signs off. Production session transport, KYC/KYB, durable revocation and audit infrastructure are separate approval gates.

**STOP at implementation 121. Item 122 requires fresh explicit user approval.**

**Final classification:** BATCH_06_SOURCE_COMPLETE / CI_PASSED / NOT_DEPLOYED / CLOUD_PROVISIONING_DISABLED / FINANCIAL_EXECUTION_DISABLED / STAGING_RELEASE_BLOCKED.
