# PAY54 Batch 24 / 965 — Independent Identity and Staging Release-Evidence Matrix

**Status:** Source review only, no automatic staging or production approval.
**PR:** Draft PR #12, stacked on unmerged Batch 23 PR #11.

| Gate | Required real-world evidence | Current evidence | Result |
| --- | --- | --- | --- |
| Source provenance | Immutable exact-head SHA, signed human review, pinned CI and migration inventory | Source branch plus dedicated disposable CI | Source review only |
| Regulated identity partner | Signed IdP contract, customer recovery, KYC/KYB and GDPR DPA | No live identity-provider partnership evidenced | BLOCKED |
| Identity verification | Production-compatible signed access assertions, trusted issuer/audience, key rotation, revocation and clock control | Synthetic Ed25519 Node tests, static staging trust config | BLOCKED |
| Assertion anti-replay | Real regional concurrency, unique JTI consumption, DB commit and failover testing | Disposable PostgreSQL replay and transaction tests | PARTIAL |
| Bootstrap and first binding | Real staging role-to-login mappings, bootstrap unbound session, atomic first account selection and revocation/audit | SQL migrations 019–020 and source-only adapter | PARTIAL |
| Database security | Real PostgreSQL host/backup, TLS, superuser separation, RLS/policies, restricted definer ownership and secrets | Unprovisioned SQL and synthetic role tests | BLOCKED |
| HTTP and rate limit | Approved HTTPS ingress, request smuggling protection, real distributed atomic limiter and abuse alarms | Nonexecuting request reader and limiter contract | BLOCKED |
| Mobile and browser | iOS/Android/desktop authenticated testing, stale-cache isolation and WCAG 2.2 AA | QA matrix only | BLOCKED |
| Current Pages exposure | Exact published artifact and public route inspection, internal-source containment | Candidate artifact scanner only | BLOCKED |
| Release infrastructure | Protected GitHub review/rulesets, signed artifact, OIDC deployer, disaster recovery rehearsal | Source-level governance and plan only | BLOCKED |
| Payments and safeguarding | Approved UK–Nigeria rails, AML, safeguarding, card provider and reconciled ledger | Partner compliance/finance not accepted | BLOCKED |

## Approval boundaries

**Engineering source accepted** requires exact final SHA tests green and independent code review; this does not authorise a merge or deployment.

**Staging trial approved** requires verified real TLS/IAM/DB/identity integration, signed change ticket, rollback and segregated provider-free test data. Human Founder/Security/DBA/Release signatures remain mandatory.

**Production approved** requires operational acceptance, money safeguarding/regulated permissions, partner terms, live QA, incident readiness, Pages containment and formal Founder/Compliance/Security/Release signoff. A signed staging-evidence object is not itself a deployment permission.

**Current verdict: NO-GO for staging account activation and production.**
