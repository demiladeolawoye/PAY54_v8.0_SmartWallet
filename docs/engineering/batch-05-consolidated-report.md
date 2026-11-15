# PAY54 Enterprise Engineering Office — Batch 05 Consolidated Report

**Date:** 2026-11-15  
**Repository:** `demiladeolawoye/PAY54_v8.0_SmartWallet`  
**Branch:** `project-titan`  
**Baseline:** `ce3e4657dacd4696d2b205e81927651695748eb4`  
**User authorisation:** Engineering Batch 05, implementations 62–91 (30 deliverables), source-only.  
**Decision:** BATCH_05_SOURCE_COMPLETE — 30/30 deliverables committed, verified in relevant GitHub Actions CI.  
**Runtime:** NOT DEPLOYED · **Staging release:** BLOCKED · **Cloud provisioning:** DISABLED · **Financial execution:** DISABLED.

## Executive summary

This batch removed duplicated account SQL from PAY54's personal/business account and wallet readers and replaced it with an immutable, parameterised, three-query catalogue. The read-only transaction and source policy foundations were hardened, and additional negative tests now cover query mutation, identity spoofing, cross-request pool isolation, malformed database results, account-selection replay, account presentation-cache isolation, audit-sink failures and local request abuse.

All changes remain source-only. No existing financial ledger posting, transaction or reservation source was changed. No business wallet, working account switcher, live authenticated account API, PostgreSQL production permission, Cloud Run resource, provider integration or customer-account deployment was activated.

## Implementation register and commits

| # | Deliverable | Committed evidence |
|---|---|---|
| 62 | Immutable canonical account SQL catalogue | `ffd1585a93c0dac4d40d01fe672fb3918f80d6d8` |
| 63 | Account-list reader uses canonical query | `13a11212869a745000b48debae28e0184d146d38` |
| 64 | Account-selection reader uses canonical query | `f0c865bcab8da7925a0e3c711038077a230581a9` |
| 65 | Personal wallet reader uses canonical query | `fb768e651c1d4a954c0545b64badb7a60b94b956` |
| 66 | SQL statement allowlist uses same catalogue | `eae7a26dadfbbbf2674b3ae1c387973d10ebaa14` |
| 67 | Catalogue immutability, parameter order and negative tests | `ec7d7b46bb8a6787abac238735b31a09d29b759b` |
| 68 | Reader/canonical-query parity and drift tests | `03fcab699b8d66698b47400b29f349b187120740`, `a0e734426b96f38c7d02ad67fb24fdeb65beebc5` |
| 69 | Verified-principal account read binding adapter | `7c35b693b4abee1f98cc3457c52934788f09b9f5` |
| 70 | Authentication and SQL enforcement tests for read binding | `77d2cb0b40a7a16765cd4f8ae47d69088d1f4a80` |
| 71 | Local lock timeout and row-security mode in read transaction | `4b57d0baa6db1590194bdd62e02f9326794ccd11` |
| 72 | Transaction settings, concurrent principal and failed-commit tests | `76308e441340a2c65bb129fba3d7519615b87268`, `8e28dda4361581716ec04ec7582f6736f7893026` |
| 73 | Bounded read-result row/column/value validator | `a9bbaec6ed6cbead4c08d063d2c64437446e16f3`; compatibility `7ac56f121276c6c3c1502eb2b366f46610d4e29d` |
| 74 | Integrate bounded output validation and adversarial tests | `246dc2776a0aa2424978fdf4a51017c8e3746509`, `76b449bf3283c6b16fa3a9672eaf52858e179119`; corrections `0e6ad3f5260e39f0bc6520f7d79b26bcd0b53718`, `36c3872c0ddb9222fd30af00436cc462ad18f148` |
| 75 | Unmounted HTTP account-access audit decorator | `347152b3ddb082ce72149557af4319bfbf1ca99c` |
| 76 | Buffered response/audit-outage negative tests | `6b78d00e3e7d80c1c711d5a1fdcb7a4dabaafd5f` |
| 77 | Nonfinancial in-memory account presentation cache | `69773a1820efba3f3bda8f15247effd19ab1456f` |
| 78 | Cache clearing, identity change and sensitive-field rejection tests | `89a9c1d97efc7a82667d26d589d6785c6ed734b8` |
| 79 | One-use short-lived account selection intent | `cd0c3f2013dd7c003250cb1879cad8e33cf635c6` |
| 80 | Stale, forged, replayed intent negative tests | `344c9590c8d58387e2d995ceaa9577b268ae2513` |
| 81 | Bounded server-keyed local account request limiter | `80b13f6a948eae736c5af7e6115acaa094b962c3` |
| 82 | Request quota/capacity and identity failure tests | `78f8aab445c141d3594a86a15fba4e9a84e9e3ce` |
| 83 | Account and financial restricted-role SQL privilege matrix | `5fd83472be63e2128db68bf4ea22276c8dcd7564` |
| 84 | Disposable PostgreSQL privilege-matrix CI | `26137dced150dc01edff30853701d9211833dbe5` |
| 85 | Offline account source security contract assessor | `62e4c9ec266860cac553dc5fc7a59284e5c75562` |
| 86 | Source mutation and missing-inventory regression tests | `268c4e8f83512515ef9d3059687076a524f166f4` |
| 87 | Integrated canonical SQL, PostgreSQL and Node CI | `e25d7dfb28b12b875df2ad89683948de271ff351` |
| 88 | Trusted identity + transaction isolation integration tests | `182d632806e934aef64ae201b5d8b2690342fd27` |
| 89 | Account security architecture and threat review | `d567447e599006c30d47e1ac392b7c07ec1fc3b6` |
| 90 | Non-deploy readiness/evidence packet | `78ba0ca386484270cf8e4b1a270d190c3f0834f7` |
| 91 | This consolidated report, ledger closure and new-approval stop gate | This report and the Batch 05 ledger closure commit |

## Automated test evidence

| CI workflow | Run | Conclusion |
|---|---|---|
| PAY54 Account Catalogue and Isolation Integration | `43769840882` on `182d632806e934aef64ae201b5d8b2690342fd27` | **SUCCESS** |
| PAY54 Account Boundary Tests | `43769840729` on `182d632806e934aef64ae201b5d8b2690342fd27` | **SUCCESS** |
| PAY54 Backend Tests | `43769840675` on `182d632806e934aef64ae201b5d8b2690342fd27` | **SUCCESS** |
| PAY54 Account Privilege Matrix | `43769679122` on `26137dced150dc01edff30853701d9211833dbe5` | **SUCCESS** |

Integrated CI checks schema migrations 001–012 in **disposable PostgreSQL 16**, SQL privilege and ledger-access checks, source-governance and account Node tests, and explicit disabled cloud/real-money modes. The final documentation-only commits do not modify the source validated in these runs.

### Intermediate failures and correction record

Early backend, account boundary and integration runs associated with commit `76b449bf3283c6b16fa3a9672eaf52858e179119` failed because a test expected the previous error name and an adversarial fixture used a JavaScript object literal that did not create an own `__proto__` property. The expected failure contract and test fixture were corrected in commits `0e6ad3f5260e39f0bc6520f7d79b26bcd0b53718` and `36c3872c0ddb9222fd30af00436cc462ad18f148`; final suites above succeeded. Superseded canceled CI runs remain in GitHub and are not counted as successes.

## Security and architectural decisions

1. **Single source of SQL truth:** Existing account list, account select, personal-wallet-ID queries and the statement policy now share the canonical query catalogue. No extra query type or SQL write operation was introduced.
2. **Read-only transaction binding:** An opaque verified server principal, fixed SQL shape, matching UUID parameters, local row-security mode, statement/lock timeouts and connection-disposal protections are required. No external database pool or login is configured.
3. **Result/data-minimisation boundary:** Account data is limited by row count, column count, field names and primitive values; privacy-safe audited responses are buffered until a separately injected audit sink acknowledges the decision.
4. **Non-authoritative UI:** In-memory labels, short-lived one-use selection intents and local request throttling do not establish backend account authority, persist a session or change a financial account. No business account switch is live.
5. **Least-privilege role tests:** All PAY54 restricted roles remain denied direct customer and money data and financial procedure execution in the disposable test database. No new PostgreSQL grant or RLS policy was installed.
6. **Zero impact to financial posting:** Existing wallet, ledger, reservations, settlement, cards and payment execution functions were untouched.

## Remaining critical risks and launch gates

- A real authenticated session verifier, replay protection, expiry/refresh controls, external request throttling and durable audit infrastructure are **not deployed**.
- No approved authenticated PostgreSQL login/role membership, row-level security policy, DB secrets, TLS/pool operational identity proof or independent live security assessment exists for account reads.
- An unmounted pure read binding does not enforce domain membership on its own; all future consumer/business endpoints must re-validate membership and account/financial scope before returning customer data.
- In-memory throttling and cache isolation are **not** equivalent to distributed production controls; mobile/desktop accessible account switch and provider-backed business KYB remain incomplete.
- No Cloud Run, network, live database, financial service, customer identity, provider integration or regulated service was deployed or enabled. STG-05 cloud and other independent staging gates remain BLOCKED.

## Recommended implementation 92

Prepare a **source-only, authenticated database-account read access design with security-reviewed RLS policies and cross-tenant negative tests**, while preserving NOLOGIN/zero-access baseline until formally approved. Prefer a dedicated authenticated and policy-constrained reader rather than granting broad SELECT to existing financial roles. Do not connect a live account API or permission any customer/monetary access under this recommendation alone.

**STOP at 91. Implementation 92 and any next batch require new explicit user approval.**

## Final disposition

**BATCH_05_30_OF_30_SOURCE_COMPLETE; CI_PASSED; NOT_DEPLOYED; FINANCIAL_EXECUTION_DISABLED; CLOUD_PROVISIONING_DISABLED; STAGING_RELEASE_BLOCKED; INDEPENDENT_RUNTIME_ATTESTATION_OUTSTANDING.**
