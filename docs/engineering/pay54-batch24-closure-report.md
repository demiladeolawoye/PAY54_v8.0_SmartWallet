# PAY54 CTO — Batch 24 Source Engineering Closure

**Batch:** 24 / 918–967.
**Accounting:** 50 numbered engineering actions committed (runtime modules, SQL migrations, adversarial tests, CI hardening, architecture/governance and documentation).
**GitHub review:** Draft PR #12 stacked on unmerged PR #11.
**Final-head verification:** Must be checked on the precise last commit; a green workflow from an earlier or cancelled SHA is not closure evidence.

## Delivered source

1. Exact, short-lived pinned-key EdDSA **access-token** verification with explicit issuer/audience/scope/JTI and reject-by-default unrecognised fields, plus time/key-rollover and forged signature negatives.
2. Strict HTTPS same-origin login request parsing, bounded raw HTTP framing and header/JSON smuggling protection. Existing PAY54 backend does **not** register the bootstrap route.
3. Additive SQL migration 019 for a restricted-function-owner, one-time issuer/JTI assertion receipt and account-unbound, maximum five-minute bootstrap session. The caller holds EXECUTE only; a separate NOLOGIN/NOBYPASSRLS definer owns the atomic function.
4. Source-only bootstrap issuer generates cryptographically random token and CSRF credentials, hashes both before SQL and releases them **only after confirmed COMMIT**. Uncertain COMMIT discards its connection; replay requires new independent reauthentication.
5. Additive SQL migration 020 binds an authorised initial Personal or Business account with a row lock, original bootstrap session revocation, new digest-only session and durable audit in one transaction. It reuses the Batch 23 restricted rotation caller and distinct executor. Backend transition factory shares CSRF, provenance and commit logic without copying the implementation.
6. Disposable PostgreSQL and Node negative tests for replay, concurrent JTI consumption, role separation, wrong account, revoked member, duplicate digest, failed receipt/session insert, HTTP and signed-token time boundaries.
7. Redacted security telemetry, a strict external distributed rate-limit admission contract, pinned Ed25519 staging trust config, signed-token-to-SQL composition tests, canonical migration source policy and retained HTTP 503 checks.
8. Real staging identity provisioning, incident recovery, device/tenant QA, architecture and Founder/Security/Compliance/Release decision matrices.

## Security correction and limitations

No identity issuer, actual customer login, provisioning, cloud IAM grant or money service is activated. PostgreSQL functions accept verified claims from an **assumed trusted server verifier**; the SQL layer does not independently perform JWT signature verification. The callable SQL role must therefore never be exposed directly to an untrusted caller, nor assigned to a generic application account without an independent isolation and penetration-test review.

The user-facing backend still rejects account discovery/context and real money requests. The bootstrap endpoint is not mounted. Source-only identity tests do not establish a usable production authentication experience. The real production environment, current GitHub Pages exposure, protected deployer, contracted provider funding/cards, UK–Nigeria regulatory compliance and real device/reconciliation QA remain mandatory P0 gates.

## Release disposition

- PR #12 remains **DRAFT and unmerged**, preserving previous working application modules.
- No database migration was applied to customer or operator-controlled staging/prod databases; all SQL tests are disposable.
- No money movement, payment/card privilege, Pages publication or provider contract was modified.
- Green exact-SHA CI is necessary but not sufficient; Founder, DBA, Security, Compliance and Release independently approve each later stage.

**CTO recommendation for Batch 25:** real identity provider and staging readiness planning, account read lifecycle/audit, hardened client integration only once genuine infrastructure and access approvals exist; concurrently prioritise current Pages artifact investigation, protected deployer and regulated partner acceptance. Production stays **NO-GO**.
