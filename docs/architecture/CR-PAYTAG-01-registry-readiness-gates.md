# PAY54 CR-PAYTAG-01 — P1 Registry Readiness and PostgreSQL Design Gate

**State:** source-only readiness design; pending upstream P0 review and integration
**Related:** Issue #29; parent contract PR #30
**Execution:** No table created, no data migrated, no role granted, no tag reserved, no recipient resolved, no funds transferred

## Compatibility reviewed

The codebase's existing `backend/domain/account-wallet-eligibility.mjs` validates verified PERSONAL account ownership and binding to a currently ACTIVE wallet for read-only access; it does not grant an alias claim. `backend/domain/account-ledger-boundary.mjs` explicitly requires trusted posting service for transfers. The initial P1 assessment composes those existing decisions and the P0 alias syntax contract rather than duplicate account or recipient validation. The Contacts local storage model is non-authoritative for financial identity.

## P1 contract introduced

`backend/domain/paytag-registry-readiness.mjs` produces a frozen, fail-closed source-only assessment:
- If syntax and PERSONAL wallet/account access are eligible, return only a proposal for later trusted registry evaluation.
- If syntax, principal, membership, account verification, wallet or binding is invalid, return a uniform denial with no account/wallet identifiers.
- Every result explicitly sets `registryWriteAuthorised: false`, `recipientResolutionAuthorised: false`, `financialExecutionEnabled: false`, `productionRelease: "BLOCKED"`.
- BUSINESS PayTag claim authority is deliberately absent pending KYB/role and ownership design approval.
- This is NOT confirmation of uniqueness, tenant RLS, actual PostgreSQL connectivity or live customer ownership.

## Requirements before an authoritative registry is coded

1. Verify existing PostgreSQL migration ordering and account/wallet FK compatibility. Introduce a versioned `pay54.paytag_registry` with immutable stable binding IDs, canonical alias uniqueness, explicit lifecycle status, version, created/changed timestamps and audit records. Reject unauthorised mutations; avoid permissive public/application grants.
2. Define a trusted, authenticated write boundary with explicit account ownership and membership checks within the same transaction. Wallet eligibility must be rechecked at the time of a claim, rotation or retirement. Race conditions need a DB uniqueness index and concurrency integration tests.
3. Define tombstone/cooldown/reassignment semantics and a beneficiary intent version check that fails closed whenever an alias changes between resolution and confirmation.
4. Prove role-specific RLS denial in a provisioned disposable PostgreSQL instance, with cross-tenant, privilege-escalation and transaction-rollback negative cases. Source unit tests alone do not count as database assurance.
5. Provide strict authenticated read endpoint with privacy-preserving denial, anti-enumeration rate controls, limited recipient display and no account-number leakage.
6. Design Personal/Business identifier policy and market-specific rules; never infer FX/payout eligibility from a tag.
7. Reuse existing secure ledger posting, idempotency and reversal infrastructure for subsequent SEND integration. Do not implement money movement in this readiness module.
8. Require independent security review, clean exact-head CI, migration rollback and staging-only operational evidence before the P1 registry can be declared implemented.

## Acceptance boundary

The current source can prove only input validation, immutable response, fail-closed account scope and absence of execution authority. It cannot claim that a real user owns a tag or that a unique tag exists. P0 PR #30 remains independently gated. This staged PR must not be merged into `project-titan` or used as a production trigger prior to upstream acceptance and re-verification against the then-current protected head.
