# PAY54 EEO — Implementation 16: Personal/Business Account Context Foundation

**Date:** 2026-11-15  
**Repository branch:** `project-titan`  
**Approval:** Explicit user approval for implementation 16 only  
**Scope:** Source-only persistence, read-only backend authorisation and isolated tests  
**Status:** SOURCE_IMPLEMENTED — NO LIVE DEPLOYMENT  
**Financial execution:** DISABLED  
**Cloud provisioning:** DISABLED  
**Staging release:** BLOCKED

## Architecture outcome

A user identity may ultimately be authorised for multiple account contexts, but a visible profile selection is **not** authority to read another account's financial data. Account type and account membership have distinct IDs and verification status. Backend authentication and server-side account membership must be enforced on each request.

The new database foundation is separate from the existing PAY54 financial ledger:

- `pay54.account_contexts` holds account identity, legal owner subject, type, display name, lifecycle and verification status.
- `pay54.account_memberships` maps an identity subject to a single account with a role and membership lifecycle.
- The migration installs a membership role/owner constraint trigger and prevents mutation of the account ID, legal owner or account type.
- Row-level security is enabled **and forced** on both new tables. No policies are installed and no grants to the restricted roles or PUBLIC are conferred. This is **deny-by-default**, not a functioning authentication service.
- No direct FK or mapping from new account records to the pre-existing `pay54.wallets.owner_subject` was introduced. That bridge must be separately designed, migrated and tested before a new account context can own a financial wallet.

## New source files

| File | Responsibility |
| --- | --- |
| `backend/db/migrations/008_account_context_foundation.sql` | Non-financial account and membership schema, conservative privileges and RLS |
| `backend/db/tests/008_account_context_isolation.sql` | Rollback-only negative SQL tests, privilege checks, no live financial data |
| `.github/workflows/pay54-account-context-db-tests.yml` | Disposable PostgreSQL 16 workflow, migrations 001–008, account and ledger regression |
| `backend/domain/account-context-reader.mjs` | Parameterised, read-only account membership queries using a backend-provided authenticated principal |
| `backend/tests/account-context-reader.test.mjs` | Negative tests for forged query results, unauthorised membership and invalid account IDs |

Existing Batch 01 modules `account-model.mjs`, `account-membership.mjs` and `account-ledger-boundary.mjs` are reused without duplicating financial business logic.

## Trust boundaries

1. **Authentication:** `resolveAuthenticatedPrincipal(request)` is supplied by a future trusted backend authentication adapter. Never implement this by reading an untrusted request body, querystring, localStorage value or selected profile label.
2. **Database:** The reader can be bound to a trusted, read-only database adapter only after review of PostgreSQL grants, RLS policies, credential management, connection-pool context isolation and audit requirements. No new database login role is created here.
3. **Membership:** A read is limited by a parameterised `principal_subject` equality and membership/account status checks. A second account-ID and membership check is performed after the database response, including for an explicitly requested account.
4. **Financial isolation:** No money posting or settlement is possible through this reader. Existing ledger and wallet tables are unchanged; no account-to-wallet association is assumed.
5. **Regulatory readiness:** Business KYB, account owner verification, permitted roles, delegated approvers, maker-checker controls and provider/legal entity onboarding are unresolved.

## Test evidence

- Disposable PostgreSQL workflow `PAY54 Account Context Database Isolation` run `43744907396` completed **success**. The workflow applies migrations 001–008 to an isolated PostgreSQL 16 service, runs rollback-only account tests and repeats ledger-access restrictions.
- The backend tests include the reader's forged-response and unauthorised-access negative tests. A test initially exposed an incorrect result filter; source commit `85f2f22ad23b9f357eefd8b7f9041dc62cb033c2` adds the independent requested-account-ID check. Final CI status must be recorded after GitHub reports completion.

## Excluded from this approval

No live migration, Cloud SQL setup, IAM or deployment changes, production account onboarding, wallet re-parenting, business activation, frontend profile switching, new HTTP endpoint, payment execution or customer-data processing.

## Recommended implementation 17

Before integrating UI switching, prepare a separate security-reviewed backend identity adapter and account-scoped read API, plus an explicit migration strategy for binding existing personal wallets to canonical account contexts without changing posted financial records. Require fresh authorisation for implementation 17; cloud deployment is a separate gated decision.
