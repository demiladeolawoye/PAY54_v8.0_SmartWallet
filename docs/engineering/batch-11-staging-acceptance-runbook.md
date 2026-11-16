# PAY54 — Batch 11 Item 307: Secure Staging Acceptance and Failure-Mode Runbook

**Source branch:** project-titan
**Date:** 2026-11-16
**Operational state:** NOT AUTHORISED TO DEPLOY
**Scope:** Independent acceptance criteria for the existing news-only STG-05 staging prototype, plus GitHub Actions and Pages publication boundaries. This document authorises no cloud or customer-data change.

## 1. Control ownership and preflight

| Gate | Accountable reviewer | Evidence required before live staging approval | Failure handling |
|---|---|---|---|
| Repository and source provenance | Release Manager + DevSecOps | Protected branch, exact reviewed commit, independent PR review and required successful CI | Halt release |
| GitHub workflow and deployer identity | Principal DevSecOps + Security | Approved dedicated least-privilege service principal, GitHub protected environment, immutable OIDC repo and workflow claims | Deny cloud token issuance |
| Action supply chain | DevSecOps | Independently resolved full commit-SHA pins, vendor identity/release records, dependency updates | Halt any unverified update |
| Cloud configuration | Security + Cloud Architect | Authenticated Google Cloud project, private networking, egress, IAM permissions, VPC subnet IPAM and cost ceiling | No Terraform apply |
| Image provenance | Release Manager + Security | Image digest, SBOM, vulnerability scan and independently verified signed build evidence | No image promotion |
| Service reachability | Security + QA | Witnessed unauthenticated access denied; expected approved identity can access internal-only staging; public ingress denied | Contain service and review logs |
| Private egress | Network Security | DNS, IPv4/IPv6, hierarchy policy and approved destinations tested negatively | Disconnect until reviewed |
| Auditing and operations | Security Operations | Durable timestamped evidence, alert response, retention, runbooks and rollback rehearsal | Halt launch |
| Customer-data/financial separation | Fintech Architect + Compliance | Production customer database and payment rails absent from staging test; no funds or personal account reads | Block and incident triage |
| Founder decision | Founder + Release Manager | Signed independent staging decision with explicit scope, expiry, rollback and accountable operators | BLOCKED by default |

## 2. Source-only checks already present

- Source gate: backend/governance/pay54-staging-trust-source.mjs
- Existing STG-05 Terraform safeguard: backend/governance/stg05-provisioning-safeguards.mjs
- Cross-workflow PR/audit review: backend/governance/pay54-pr-workflow-trust-audit.mjs
- Action reference inventory: backend/governance/pay54-actions-dependency-audit.mjs
- Real local repo scanner: backend/governance/pay54-workflow-inventory-cli.mjs
- Composed readiness gate: backend/governance/pay54-staging-source-readiness.mjs
- Independent GitHub-hosted source test: .github/workflows/pay54-batch11-publication-governance.yml

Passing these **only proves the observed source assertions and tests**. It does not prove a deployed environment, protected GitHub settings, real secrets custody, actual RLS, runtime network controls or independent acceptance.

## 3. Required negative exercises

| Scenario | Expected containment and evidence |
|---|---|
| PR from fork attempts to read repository/environment secrets | No environment exposure, no secret scope, token cannot write |
| Malicious title/body/branch interpolated into shell | No execution of attacker-controlled commands; bounded safe parsing and input handling |
| Action dependency tag changes without reviewed SHA | CI flags mutable dependency; pin verified publisher SHA before promotion |
| Unauthorized identity requests cloud token | Rejected by trusted workflow and branch/environment controls; cloud audit event retained |
| Terraform enabling WIF or provisioning without explicit release | Source review stops it; protected environment also prevents execution |
| Unauthenticated request to staging or public ingress | Denied; independently witnessed negative test |
| Staging service attempts non-approved outbound connection | Denied by effective network/egress rules; logs and policy reviewed |
| GitHub Pages contains backup, source map or internal file | Incident team verifies actual accessibility, contains exposure and rotates affected credentials |
| Audit sink outage or inconsistent receipt | Request fails closed; no disclosure or transfer |
| Staging failover/restore, process crash or stale image | Revert to reviewed digest; recovery time and audit trail recorded |

## 4. Evidence, responsibilities and exit criteria

For each exercise record the reviewed Git commit and workflow run ID, environment/project identity, UTC timestamp, independent operator and witness, exact expected vs observed result, sanitized screenshots or logs, failure classification, remediation owner, retest and signed disposition. Do not commit keys, secrets, personal data, customer financial records or unredacted cloud logs into the public repository.

All critical controls require independently witnessed positive and negative checks before an environment is ever promoted. Any unknown result is **NOT VERIFIED**, not passed. There is no permission here to provision STG-05, grant customer SELECT, enable card/payment rails, bypass GitHub Pages protections or proceed to production.

## 5. Launch-program connection

After staging acceptance, separately obtain regulatory/legal and contracted partner approvals for UK–Nigeria onboarding, AML/KYC/KYB, safeguarding, settlement and reconciliations; conduct independent penetration, resilience, mobile compatibility and accessibility testing; and secure a Founder-signed go-live decision. This runbook is one acceptance component, not the global PAY54 release plan.
