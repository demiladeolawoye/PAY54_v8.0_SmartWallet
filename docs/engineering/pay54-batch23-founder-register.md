# PAY54 CTO — Batch 23 Founder Implementation and Change Register

**Batch:** 23 / numbers 868–917 (50 auditable engineering actions, corrections, tests, runbooks and controls).
**Draft PR:** #11, stacked on unmerged Batch 22 PR #10.
**Operational status:** NO-GO. No production/staging database migration, login, real credential, HTTP account-switch endpoint, Pages publish, payment or ledger operation performed.

## Implementation accounting

| IDs | Source work and correction | Real status |
| --- | --- | --- |
| 868–870 | SQL rotation migration, authorised transaction test, replay/CSRF/version/tenant negative tests | Source committed; synthetic DB CI required |
| 871–872 | Disposable PostgreSQL CI and narrow revoked-row RLS policy correction | Source committed |
| 873–875 | Server-side credential rotation adapter, uncertain-commit connection quarantine, adapter tests | Source committed; HTTP not wired |
| 876–881 | Concurrent replay proof, retained HTTP 503 regression, audit/token failure rollback, role-separation tests, revoked token reader denial | Source committed; CI required |
| 882–884 | Migration security inventory, adversarial guard and CI hardening | Source committed |
| 885–886 | Ed25519 signed staging evidence verifier and tamper/replay tests | Source committed; independent keys not provisioned |
| 887–888 | Staging-only TLS and separate credential configuration plus negative tests | Source committed; connection not established |
| 889–890 | Actual effective PostgreSQL role probe and failure-path tests | Source committed; real staging pools absent |
| 891–896 | Privilege correction: separate function-only caller from restricted SECURITY DEFINER owner; SQL/governance/Node proof | Source committed; review required |
| 897–902 | Direct-DML denial, forged actor, overflow, suspended target, revoked member and expired session SQL tests | Source committed; disposable DB only |
| 903–904 | Canonical 001–018 SHA256 migration drift verifier and tests | Source committed |
| 905–906 | Signed evidence + role probe + source-hash cutover review and negative tests | Source committed; cannot release automatically |
| 907–908 | Candidate Pages artifact scanner and backend/development-provider leak tests | Source committed; current public Pages not inspected |
| 909–910 | GitHub release ruleset read-only assessment and tests | Source committed; actual deployer/OIDC not accepted |
| 911–914 | Rollback runbook, threat model, device QA matrix and staging database provisioning SOP | Source committed; operational work pending |
| 915–917 | Founder change register, release decision matrix and source closure | Commit/CI to be verified on exact final SHA |

The 50 numbered actions are **not** 50 customer-facing app features. Source changes that were corrected or superseded are recorded as engineering work, never as deployed capabilities. A passing synthetic test is not evidence of operating a production banking platform.

## Change requests and P0/P1 risks

| ID | Priority | Open requirement | Acceptance owner | Real status |
| --- | --- | --- | --- | --- |
| CR-ACCOUNT-02 | P0 | Real trusted account directory and Personal/Business selection API; independent session issuer; secure token/CSRF ingress | Backend, Security | Not provisioned; 503 preserved |
| CR-SESSION-01 | P0 | Restricted definer function acceptance, session rotation and revocation under IAM-mapped real staging role | DBA, Security | Source only |
| CR-DB-01 | P0 | Real staging database, ordered 001–018 migrations, PITR/backups, tenant/RLS proof and rollback | DBA, DevSecOps | Not provisioned |
| CR-PAGES-01 | P0 | Investigate historical oversized Pages artifact and verify current published exposure and containment | Security, DevSecOps | Unresolved |
| CR-CARD-01 | P0 | Resolve development linked-card provider vs approved production card partner | Fintech Architect, Frontend | Open |
| CR-DEPLOY-01 | P0 | Protected branch, release environment, deployer OIDC, narrow cloud IAM, controlled Pages publisher | Release, DevSecOps | Not accepted |
| CR-FINTECH-01 | P0 | UK–Nigeria payment-partner contracts, regulated permissions, safeguarding/KYC/KYB/AML and settlement/reconciliation | Founder, Compliance | Not accepted |
| CR-QA-01 | P1 | Authenticated account transition on real Android/iOS/mobile/desktop, ten-domain caches and WCAG 2.2 AA | QA, Mobile, UX | Pending |
| CR-OBS-01 | P1 | Durable security monitoring, anomaly alerts, audit retention, incident drills and forced-reauth recovery | Security, SRE | Pending |

Read-only GitHub repository-ruleset metadata inspected in this session returned an empty list. That does **not** establish that branch protection, environments or other security controls are absent; those require their own authenticated evidence.

## Change management

- Leave PR #11 DRAFT, based on unmerged PR #10; preserve earlier source and avoid touching the live website.
- Never attach a login or make payments available merely because a PostgreSQL function and CI pass.
- Require exact final-head CI and independent DBA/Security review of restricted SECURITY DEFINER ownership, no direct caller DML and rollback invariants.
- Continue the existing 50-action source review cycle only with the Founder-approved security-first boundaries.
- Hold production until all P0 operational risks have independent, signed evidence and explicit human authorisation.

**CTO decision:** Batch 23 source cycle review only. Operational cutover is **NO-GO**.
