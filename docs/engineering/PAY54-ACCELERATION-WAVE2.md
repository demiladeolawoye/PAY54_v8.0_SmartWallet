# PAY54 Accelerated Engineering — Wave 2 Capability Evidence

26 November 2026. Integration candidate stacked on approved PR #98, **NOT** merged. The delivery shifts from governance-only PRs to testable financial-core, customer-presentation, infrastructure and integrated regression code.

## Financial Core — executable guard (no customer money)
`backend/src/wave2/canonical-writer-admission.mjs` implements a fail-closed financial admission contract. It evaluates transaction-bound session row locking, database-attested principal and account membership, FORCE-RLS minimum grants, revocation locking, positive canonical reserve/capture/release and ledger/idempotency/outbox proof. Self-reported evidence never issues payment authority: even all-true inputs demand independent attestation. This is a **guard**, not the eventual legitimate ledger writer.

Existing canonical money functions continue to be `SECURITY INVOKER` and disabled for the current unprivileged role. No new grant, migration, production SQL, payment routing or customer-money API is introduced. The positive canonical writer remains P0, with separate DBA/Security review before implementation and execution.

## Frontend/API integration — executable read model
`backend/src/wave2/wallet-read-model.mjs` creates a deterministic, immutable, mobile-consumable view model from a **contract-defined** authoritative wallet snapshot. It uses minor units as decimal strings and BigInt for exact subtraction, rejects duplicate IDs, invalid monetary/currency values and holds larger than posted, and never exposes an enabled transfer action.

**Important:** The `pay54.wallet-read.v1` contract is a proposed adapter interface, **not** proof an authenticated API already emits such snapshots. It is not yet mounted into the existing dashboard/mobile runtime and cannot substitute for production session/RLS/API verification.

## Platform/DevSecOps — executable non-provisioning check
`backend/src/wave2/staging-admission.mjs` separately checks GBP price, storage/backups/networking, explicit approval, IAM, TLS, secrets, monitoring, restore and rollback readiness. Even an all-true claim never authorises a paid provisioner. No credentials or infrastructure resources created.

## QA and integration
`backend/tests/pay54-wave2-capability-contracts.test.mjs` exercises positive display calculation, failure on malformed/untrusted snapshots, closed financial gates and denied cloud provisioning. The *existing full disposable PostgreSQL 16 CI* is triggered by this Wave2 source change on the stacked branch to preserve all canonical RLS/ledger/revocation checks. Green unit checks cannot be substituted for full PG16 results.

## Release dependency and parallel work packages
| Package | Delivered this wave | Still outstanding |
|---|---|---|
| FIN-CORE | Fail-closed executable canonical admission contract | Actual transaction-bound authenticated writer, grants and positive canonical SQL |
| FRONTEND-API | Immutable currency/minor-unit wallet-read model + tests | Real signed/authenticated API adapter; dashboard/mobile wiring and UAT |
| PLATFORM-SECURITY | Executable staging preflight + denial tests | Cost quote, approval, infrastructure and disaster-recovery proof |
| RELEASE-INTEGRATION | One cumulative PR stacked on #98, full PG16 CI triggered | Independently approved source-merge strategy for #81–#98 |
| PARTNER-RAILS | Existing partner roadmap retained | Contracts, certification, adapters and settlement |
| RELEASE-ASSURANCE | Cross-capability Node tests and full PG16 regression | Integration UAT, stress, pen test, operations and final release approval |

## Acceptance and non-regression
- Unit and full disposable PostgreSQL CI must complete on exact PR head.
- Independent reviewer must inspect security boundaries and the data contract before any source merge proposal.
- No real-money command execution, service impersonation, financial DML privilege increase, Cloud SQL provisioning, staging or production.
- Remaining engineering critical path: trusted DB transaction principal, canonical positive reserve/capture/release, real writer/revoker concurrency; connected UI APIs; approved UK–Nigeria rails; compliance and operational release.

**Staging NO-GO · Production NO-GO · Cloud spending not authorised.**
