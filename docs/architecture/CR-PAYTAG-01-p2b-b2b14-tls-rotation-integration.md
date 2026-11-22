# PAY54 CR-PAYTAG-01 P2B-B2B14 — Disposable TLS and Credential Rotation

PR #65 source-only baseline: `12719b38e5a8a5726c242bba981775f09cb72051`.

## What is independently tested
The GitHub Actions workflow uses a throwaway PostgreSQL 16 service container. The script generates a disposable certificate authority and localhost server certificate within that container, enables PostgreSQL TLS, and exercises an actual libpq TCP connection with `sslmode=verify-full`, checking that `pg_stat_ssl.ssl` is true.

It confirms that an incorrect hostname, unrelated CA, or `sslmode=disable` fails. A separate random, synthetic login password is rotated via PostgreSQL's `ALTER ROLE`. The new password authenticates over verified TLS; the old one is rejected on a fresh physical connection. The disposable login has no PAY54 schema usage, roles or financial privileges and is dropped on cleanup. No test credentials are committed or printed.

## Boundaries
This is a local disposable PostgreSQL instance, **not** a managed cloud database and not PAY54 staging. Its self-generated CA and tests cannot prove the selected real provider's TLS chain, network endpoint, workload identity, secret manager, rotation API, revocation of existing pooled sessions, or operational recovery.

The standalone test script is restricted to an environment explicitly marked `DISPOSABLE_CI`. It is not a migration, credential provisioning instruction or production release workflow. It does not change canonical SQL migrations 001–028, protected branch privileges, customer routes, or financial ledger activity.

## Remaining security gates
- Choose and independently verify cloud/database provider, workload identity, private ingress/egress and managed TLS trust roots.
- Approve dedicated login role assumption through security and DBA review.
- Design a secret-store-backed credential rotation controller, transaction-pool draining, credential generation fencing and rollback.
- Test live-provider IAM, TLS chain/hostname, denied insecure modes and audit telemetry under a staging-only change ticket.
- Prove authenticated PayTag registration, concurrency, idempotency, after-commit receipt reconciliation, and rate limits using the actual approved backend deployment.

## Release decision
**Source-only integration permitted only after exact-head CI and independent review. Persistent staging and production activation: NO-GO.**
