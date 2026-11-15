# PAY54 Enterprise — Engineering Batch 03 (32–46)

**Authorised:** 2026-11-15 by the user.  
**Branch:** `project-titan`. **Baseline:** `59b7d549bf1fdbed46c025194bc57b26dc0ccde9`.  
**Boundaries:** Source-only code, disposable CI database and tests. **Do not** deploy, apply to live databases, grant credentials/IAM, enable wallet operations, merge branches or spend cloud funds.

## Work package register

| Item | Deliverable | Target | Status |
|---|---|---|---|
| 32 | Wallet ownership immutability for bound accounts | `backend/db/migrations/010_wallet_binding_lifecycle_guard.sql` | PENDING |
| 33 | PostgreSQL negative owner-mutation and revocation tests | `backend/db/tests/010_wallet_binding_lifecycle_guard.sql` | PENDING |
| 34 | Ephemeral PostgreSQL migration-010 CI gate | `.github/workflows/pay54-account-lifecycle-tests.yml` | PENDING |
| 35 | Read-only live binding eligibility policy | `backend/domain/account-wallet-eligibility.mjs` | PENDING |
| 36 | Wallet eligibility lifecycle regression tests | `backend/tests/account-wallet-eligibility.test.mjs` | PENDING |
| 37 | Parameterised account-bound wallet read repository | `backend/domain/account-wallet-reader.mjs` | PENDING |
| 38 | Wallet repository cross-account negative tests | `backend/tests/account-wallet-reader.test.mjs` | PENDING |
| 39 | Harden read-only account handler request boundaries | `backend/http/account-context-handler.mjs` | PENDING |
| 40 | HTTP malformed path and identity denial regression | `backend/tests/account-context-handler.test.mjs` | PENDING |
| 41 | Strengthen authenticated principal freshness safeguards | `backend/domain/trusted-account-principal.mjs` | PENDING |
| 42 | Session expiry and verification regression tests | `backend/tests/trusted-account-principal.test.mjs` | PENDING |
| 43 | Wallet eligibility database read-only SQL view | `backend/db/migrations/011_wallet_eligibility_view.sql` | PENDING |
| 44 | SQL view revocation and isolation negative tests | `backend/db/tests/011_wallet_eligibility_view.sql` | PENDING |
| 45 | Integrated account SQL + JS security workflow and review | `.github/workflows/pay54-account-security-integration.yml` | PENDING |
| 46 | Consolidated implementation report and stop gate | `docs/engineering/batch-03-consolidated-report.md` | PENDING |

A unit counts as complete only after its source is committed and relevant automated test results are reviewed. Item 46 is a consolidation checkpoint, not approval for item 47. Any unresolved CI failure must remain visible.

**Gates:** Financial execution DISABLED; Google Cloud provisioning DISABLED; independent security approval OUTSTANDING; staging/production release BLOCKED.
