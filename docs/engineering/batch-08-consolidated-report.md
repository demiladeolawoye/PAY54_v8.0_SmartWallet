# PAY54 Enterprise Engineering Office — Batch 08 Consolidated Report

**Date:** 2026-11-15  
**Repository:** `demiladeolawoye/PAY54_v8.0_SmartWallet`  
**Branch:** `project-titan`  
**Baseline:** `d7b1389cbe1fc78f617e063318ec4948dcf9d574`  
**User approval:** Source-only implementations **152–181** (30 deliverables), followed by this report and a fresh approval stop.  
**Outcome:** 30/30 source deliverables committed; dedicated SQL and integrated PostgreSQL+Node CI successfully completed.  
**No live database migration; no new PAY54 customer SELECT grants; cloud provisioning DISABLED; financial execution DISABLED; production/staging release BLOCKED.**

## Executive engineering assessment

Batch 08 introduces an **unmounted database-actor verification proof**, not an enabled login or account-read API. In a disposable PostgreSQL environment, two NOLOGIN test tenant roles and a test-owned row-security table demonstrate positive own-tenant reads and negative other-tenant reads. A separate test demonstrates that a caller-controlled `set_config` value cannot become `current_user`. All test-created roles, grants, relations, rows and policies are transactionally rolled back and verified absent.

The PostgreSQL identity design explicitly rejects a privileged shared application connection capable of switching arbitrarily between tenant roles as a sufficient authentication boundary. Actual positive PAY54 account SELECT permissions still require a new, independently approved authenticated role/credential model and a separate reviewed database migration. The existing PAY54 `pay54_account_reader_role` remains NOLOGIN, unassigned and without access. Restrictive `USING(false)` policies are unchanged.

Additional source-only modules provide trusted-principal-to-actor metadata, an immutable approved role registry, expiring one-use read tickets, transaction-level `current_user` verification without `SET ROLE`, cross-account row authorisation, minimal display response, audit-before-disclosure, a per-intent atomic replay backend contract and negative regression tests.

## 1. Implementation register and commit evidence

| # | Delivered engineering implementation | GitHub commit |
|---|---|---|
| 152 | Security RFC: DB actor trust and nonspoofable identity | `db697ce64f602bd2e9a8a8ff4952f11f8a684cca` |
| 153 | Positive and negative test-only PostgreSQL actor RLS proof | `ed1675f081d8dbc11dbb0d4c2c7e75a2e0954a22` |
| 154 | Adversarial user-settable subject GUC/role isolation | `b1e56270912b3258a42819b94f6b292f99edd470` |
| 155 | Test-created role, grant and fixture rollback attestation | `9232cfc0a31b472b43d9ef6d32848813c40f5bf2` |
| 156 | PostgreSQL 16 isolated actor-proof workflow | `8aacc4f3319950275a2479f97072d00ab279f4c0` |
| 157 | Opaque, immutable verified server-to-database actor descriptor | `e10cc9d126b1d7c8bbd6b787b31efdf3f047af69` |
| 158 | Principal spoof, unapproved role and copying negative tests | `c7c29c5a2f9105b0e77df35fdde6993ae48a734e` |
| 159 | Immutable reviewer-controlled actor-role mapping policy | `0adff186f40726a3d10df925244f0134cdba8c5d` |
| 160 | Duplicate subjects/roles and elevated-role rejection tests | `aa66c5376b7942bb02eaf1e184ae635b91392e80` |
| 161 | Single-use, short-lived canonical account-read ticket policy | `65bddcedf71d28be67b3d7eefcf261e462164541` |
| 162 | Ticket expiry, forgery, substitution and replay regressions | `eb279087ca07b9aac15924d27805419d680386a7` |
| 163 | Read-only transaction verifying DB actor `current_user` | `26d4924d89cad9b89030210a80a16b29f97798d0` |
| 164 | Actor mismatch, cross-identity, rollback and connection-discard tests | `505a022c2f4d082459042a6764422898c16699f0` |
| 165 | Per-row source-domain Personal/Business membership decision | `8bf8966c975cd0e21fc098ff815ffb5c457348c0` |
| 166 | Revoked business, selected account and cross-tenant negative tests | `bf445dfd371646472a1317624c97509e0dc542d1` |
| 167 | Unmounted one-ticket account-label read service | `40d0745f4b6ffb46711679dc6bbc9ab54e320af2` |
| 168 | Read service cross-tenant, duplicate, revoked and wallet-route denial | `88f9d7cf892d6b7e8be1709ba1b45ddebb1011e3` |
| 169 | Audit-before-disclosure account read orchestration | `dea92d5a31c0afde5df830db824b3aa69a58b4d0` |
| 170 | Audit-outage, sanitisation, error and sequencing regressions | `83ca7ee55615177bf3aeee7f7b14068819652d6f` |
| 171 | Strict account-label response and no-store headers | `ba5db91cb2d839516ac693a1e7aaaf1564839f18` |
| 172 | Response duplicate, extra field, token and balance leakage tests | `a9fb5169d283365964c5bd7cf7c66387daaebdb9` |
| 173 | Atomically claimed non-authoritative read intent with actor/nonce scope | `277cd0a0ad7ced641386f2c6fc8fa6c95073aa52` |
| 174 | Replayed nonce, forged actor, invalid query and backend outage tests | `69e0f53bee6f87d0e715a0fc0ffebfe1a5b9f83b` |
| 175 | Central view/manage/initiate/approve capability matrix | `4e78949c963893f295963fbdf4e2f6864ace1b20` |
| 176 | Revocation, KYB-state and no-financial-authority tests | `ff060692364e5133b7024357989d61579c5b7e9a` |
| 177 | Offline source audit: RLS denies, actor verification, role grants and rollback | `3fcd5ac90b4b9ba15d57feec78613c366f454095` |
| 178 | Security mutation tests to detect weakened identity/RLS/SQL | `6c20d329527697da68a49ce87e3e852b5fb0d799` |
| 179 | Integrated disposable PostgreSQL 16 + Node.js CI workflow | `9c3f8099f9e686d0a976693bee4b12833c306b61` |
| 180 | Source-only independent review and release-readiness packet | `dfab0d736b12eefbb869f77884591427586eeb37` |
| 181 | This consolidated report, approval ledger closure and item-182 stop | Report and ledger closure commit |

## 2. Verified CI and evidence limitations

| Workflow | Run ID | Source commit | Verified conclusion |
|---|---|---|---|
| PAY54 Account Authenticated DB Actor Proof | `43773351519` | `8aacc4f3319950275a2479f97072d00ab279f4c0` | **SUCCESS** |
| PAY54 Account Boundary Tests | `43773902415` | `6c20d329527697da68a49ce87e3e852b5fb0d799` | **SUCCESS** |
| PAY54 Batch 08 Authenticated Actor Integration | `43773942035` | `9c3f8099f9e686d0a976693bee4b12833c306b61` | **SUCCESS** |
| PAY54 Backend Tests (full suite) | `43773902427` | `6c20d329527697da68a49ce87e3e852b5fb0d799` | **PENDING AT REPORT AUTHORING — DO NOT COUNT AS PASSED** |

The successful integrated workflow runs source migrations 001–013 in isolated PostgreSQL, tests the new positive/negative actor SQL proof, historical negative suites 007–015, source-security checks, `node --check` and account-related Node.js regressions, and validates disabled provision/payment flags. It does not automatically constitute full backend suite success or independent cloud attestation.

Intermediate backend test runs may be canceled by GitHub's normal workflow concurrency when successive source commits are made; those are not evidence of a passing regression run.

## 3. Architectural decisions and compatibility

1. **No production actor grant:** `pay54_account_reader_role` remains NOLOGIN with no memberships, data grants or BYPASSRLS privileges. Migrations 001–013 and financial posting/reservations source remain unchanged.
2. **Role proof is deliberately test-only:** PostgreSQL `SET ROLE` in the disposable test is a simulation by a privileged CI operator and is not a safe login identity mechanism on its own. The application actor adapter never performs `SET ROLE`; it checks the effective role on its already-provided connection before running a read.
3. **Session/domain/DB separation:** Opaque trusted server principal, registered expected DB role, current DB actor, canonical parameterised SQL and current membership are separate validations. Source metadata alone is never equivalent to a credential.
4. **Privacy and response limits:** Account label reads project account ID/type/display name only. Balance, card, transaction, token, account-owner details and arbitrary row payloads are not part of this new response.
5. **Audit gate:** A successful source account read is released only after an injected audit sink acknowledges its event. Durable storage, retention, replay and operational failure modes are still not deployed.
6. **Financial execution remains explicitly false:** Capability labels, account-display eligibility, read intents and read tickets grant no monetary authority. The working dashboard account-switcher remains unmounted/unactivated.
7. **Release restrictions preserved:** No live DB migration, IAM/credential issuance, GCP provisioning, provider enablement, main-branch merge, customer data or real-money action was performed.

## 4. Open risk and independent sign-off list

- No nonspoofable production DB role/login binding, no real per-tenant account RLS allow policy, no real customer data SELECT permission. Positive RLS proofs use **test-only relations**.
- A pooled superuser or shared actor capable of arbitrary `SET ROLE` remains unsuitable for real customer reads; effective DB actor checks alone cannot fix this trust boundary.
- Real cryptographic login/session transport, revocation/replay atomic store, edge identity, MFA, CSRF protection, account provisioning, KYC/KYB and legal ownership checks are outstanding.
- No durable audit pipeline or verified operational alerting, retention, deletion/legal hold and independent incident response testing.
- No actual live Personal/Business switching, business wallet ledger isolation, regulated payments, card lifecycle, provider rails or production financial execution.
- No independently verified STG-01..STG-07 cloud/network release approvals; staging and production launch remain BLOCKED.
- The full backend test run `43773902427` was still pending at the time of initial report drafting; a final full-backend result must be checked before relying on it for broad zero-regression claims.

## 5. CTO recommendation — implementation 182

The next source-only phase should build a **security-reviewable least-privilege authenticated account-access deployment design**, with explicit answer to who owns each database role, how the verified principal obtains a session, how an actor is confined to one tenant, and how independent auditors prove permissions and pool reset behavior. It should prioritize strong positive and negative authorisation tests in a disposable environment while preserving current deny-only production architecture until independent operational sign-off.

**STOP:** User approval for Batch 08 ends at item 181. Implementation 182 requires new explicit user authorisation.

**Final classification:** BATCH_08_30_OF_30_SOURCE_COMPLETE; ISOLATED_ACTOR_PROOF_PASS; ACCOUNT_INTEGRATION_CI_PASS; LIVE_DB_RLS_ACCESS_DISABLED; CLOUD_PROVISIONING_DISABLED; FINANCIAL_EXECUTION_DISABLED; STAGING_RELEASE_BLOCKED.
