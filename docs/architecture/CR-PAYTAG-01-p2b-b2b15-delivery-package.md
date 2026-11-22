# PAY54 P2B-B2B15 — Cohesive Connection Lifecycle and Fast-Delivery Governance

## Protected baseline

PR #66 was independently approved, three exact-head checks passed, and its protected merge was confirmed at `246f11e74a3010639e4329eb745b23eb61309a37`.

## Combined security package

This package delivers one bounded, test-only operational connection lifecycle with:
- Monotonic opaque credential generations and a retired-generation denylist.
- Hard exclusion of rotations while database operations or checkouts are in flight.
- A separately injected identity-and-transport attester before and after a callback.
- A disposable-only constructor, double-attestation privilege-drift denial, and all-path physical connection discard.
- Explicitly untrusted client output and fail-closed handling of failures, shutdown and duplicate checkouts.
- Regression tests covering normal execution, wrong TLS role, wrong isolation, privilege elevation, rotation races, stale generations, uncertain operations, and closure.

This package **does not** retrieve a secret, establish an authenticated PostgreSQL connection, implement production rotation, terminate server sessions, verify a live certificate, or activate PayTag. The attester is an externally supplied test dependency: its boolean result cannot be accepted as production proof without real provider authentication and a reviewed backend integration.

## Faster delivery policy — effective from PR #67

1. Each PR should encompass a cohesive bounded capability with executable implementations, security-negative tests, CI, architecture decision and rollback/release holds. Do not combine unrelated financial authorities into a single PR simply to reduce approval count.
2. Parallel workstreams are permitted only when they share no unreviewed mutable SQL, deployment or financial execution dependency.
3. Complete checkpoints report **50 tracked source actions where meaningful**, but every item must map to an actual changed file, test, fix or evidence item. Counting test names or planning paragraphs is not proof of deployment completion.
4. Standard checkpoints include the exact commit, passing workflows, status of independent review, unresolved blockers and clear source-only versus staging/prod distinction.
5. Security gates stay non-negotiable: protected branch, testable exact HEAD, independent reviewer, explicit merge, separate staging approval, separate production approval.
6. Monthly code-volume and historical PR count are not launch-ready percentages. Report blocked operational work without presenting unverified progress as complete.
7. Before creating additional isolated "policy checkers", prefer a real disposable test or a reusable production-quality component that demonstrably moves the platform towards staging.

## Verified high-priority operational blockers

The existing Batch 25 source register identifies:
- CR-PAGES-01 public Pages publication containment.
- CR-CARD-01 development linked-card provider containment.
- CR-DEPLOY-01 protected deployment authority, OIDC and environment verification.
- CR-IDENTITY-01 customer identity, login, MFA and recovery provision.
- CR-DB-01 persistent PostgreSQL with verified RLS, restoration and rollback.
- CR-RATE-01 distributed atomic rate limiter.
- CR-FINTECH-01 contracted UK–Nigeria regulated routes and safeguarding.
- CR-QA-01 real device, tenant isolation, accessibility and journey acceptance.

These remain real-world verification gates even when source code and disposable CI are green. Historical open PRs should be individually reconciled as merged/superseded/evidence-only rather than merged en masse.

## Remaining critical activation dependencies

An approved actual database provider, physical workload identity, secret manager, verified TLS, session role-assumption design, live credential rotation/drain, service endpoint security, financial permissions, independent DBA/security review and staging-specific change control must all precede any persistent PayTag execution. Public web and partner rails remain separate programme dependencies.

**Release:** source-only integration subject to independent review. No persistent staging or production activation. PAY54 production NO-GO.
