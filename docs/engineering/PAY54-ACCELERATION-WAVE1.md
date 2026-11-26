# PAY54 Accelerated Enterprise Engineering — Wave 1 Control Plan

Effective 26 November 2026. This plan changes engineering scheduling and review packaging, **not** financial privileges, cloud spending authorisations, or release policy.

## Evidence-based initial condition
- Protected source branch: `project-titan`. Previously audited base commit `917404fdb83b4f208cd709c0c7fede832f4f0205`.
- PRs #81–#97 are distinct Draft source proposals. The permanent integrated Batches 41–49 source candidate is PR #92, and PRs #93–#97 form a cumulative stack on that candidate.
- PR #97 is green in its source and disposable PostgreSQL 16 checks, but had no independent approved review at the last live status check. No PR in the audited #81–#97 range was merged into the protected branch.
- Existing tests prove restricted synthetic ledger operations and canonical deny posture. They do **not** prove positive canonical wallet transfer execution or genuine deployment readiness.

## Controlled integration Wave 1
1. Keep original PRs and evidence available; **do not merge individual overlapping branches blindly**.
2. Verify exact six commit heads #92–#97, their ancestry, the protected base and the cumulative candidate. A SHA/ancestry mismatch blocks integration; refresh evidence through independent review.
3. Audit the combined financial/schema/workflow diff with independent Security, DBA, QA and Release review. Existing CI results are evidence inputs, not substitute approvals.
4. Request explicit separate **source-only merge admission**. No direct pushes to protected branches. When approved, Release Manager prepares one reviewed integration PR with all dependencies; superseded PRs are closed only after traceable confirmation of inclusion.
5. Re-run targeted regressions during authoring and full disposable PG16 ledger/RLS/revocation + frontend/API test matrix against the exact integrated candidate. No skipped critical financial tests.
6. A source merge cannot authorise Cloud SQL deployment, customer money, partner rails, managed staging or production.

## Capability-based delivery work packages
- **WP-FIN:** trusted session/transaction principal, exact canonical financial writer RLS and grants, positive canonical reserve/capture/release, idempotency and revocation. Financial permissions remain under separate Security/DBA PR approval.
- **WP-INTEGRATE:** protected branch integration, code ownership, source test/policy inventory, repository hygiene.
- **WP-PLATFORM:** staging architecture, secret isolation, TLS/IAM, monitoring, backups and rollback; design only until explicit cost and provisioning approval.
- **WP-JOURNEY:** customer-facing wallet/mobile/web, accessibility, API contracts and safe mock-provider journeys; maintain feature flags.
- **WP-RAILS:** UK banking and Nigeria payout route qualification, reconciliation and regulatory/partner due diligence; contract evidence needed before exposure.
- **WP-ASSURANCE:** continuous negative-security CI, contract tests, performance baselines, recovery rehearsal and consolidated release evidence.

Work packages may be developed in parallel; money-moving schema/authentication changes must not be merged in parallel without dependency review.

## New review cadence
- One consolidated engineering report per capability package or at most 50 related implementation items, covering complete files, SHA, automated tests, independent reviewers, regressions, blockers and change requests.
- Targeted fast checks for PR feedback, with mandatory full financial and integration suites on final cumulative candidate.
- No silent merge, deploy, provision, secrets generation, partner activation, paid resource or product launch.
- A progress report's item count is not a release-readiness percentage.

## Register — unclosed work
| Category | Current blocker | Owner |
|---|---|---|
| SRC-01 | Reviewed cumulative source integration, including #81–#97 | Release Manager / Security |
| FIN-01 | Positive canonical restricted writer and transaction-bound authenticated principal | Backend / Fintech / DBA |
| FIN-02 | Real canonical posting-versus-revocation concurrency and ledger/outbox invariants | Fintech / QA |
| CLOUD-01 | Final GBP Cloud SQL compute, SSD, backups and network quote | Finance / DevSecOps |
| CLOUD-02 | Explicit spending permission, IAM/TLS, secrets, rollback, logging | CTO / Finance / Security |
| RAILS-01 | Contracted UK provider, two Nigerian payout routes and settlement/reconciliation certification | Fintech / Compliance |
| COMPLY-01 | Regulated permissions, KYC/AML/fraud/sanctions and operational support evidence | Legal / Risk / Compliance |
| UX-01 | Verified API-to-frontend/mobile journeys and accessibility UAT | Frontend / Mobile / QA |
| RELEASE-01 | Independent penetration test, disaster recovery and final go/no-go evidence | Security / Release |

## Change requests and reminders
Retain existing CR-PAGES-01, CR-CARD-01, CR-DEPLOY-01, CR-IDENTITY-01, CR-DB-01, CR-FINTECH-01, CR-QA-01, CR-OBS-01 and CR-PAYTAG-01 until each has an owner and acceptance evidence. Planned enhancements (WhatsApp entry, crypto/stablecoins, PAY54 Points, commerce, additional cards and business wallets) remain behind separate feasibility/regulatory/partner gates. Confirm GitHub deployer/service account design, cloud price estimate, partner contact responsibilities and full backlog closure evidence.

## Timeline — conditional, not a promise
- **26 Nov–4 Dec 2026:** Wave 1 integration admission, architecture contracts, backlog hygiene; complete only with source review.
- **5–15 Dec 2026:** internal MVP *assessment*, conditional on integrated source and regression.
- **December 2026–January 2027:** target additional canonical financial writer proofs and end-to-end engineering QA.
- **January–March 2027 or later:** conditional staging and external partner certification subject to cost, compliance and deployment authorisation.
- **Public pilot and launch:** no committed date. Require actual financial settlement/regulatory/operational proof and explicit go/no-go.

**Staging NO-GO · Production NO-GO · Customer funds disabled · Cloud spending not authorised.**
