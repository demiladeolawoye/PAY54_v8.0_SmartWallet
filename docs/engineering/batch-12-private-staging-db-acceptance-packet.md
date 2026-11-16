# PAY54 Batch 12 — Private Staging and Database Identity Acceptance Packet (Item 358)

**Date:** 2026-11-16
**Source branch:** project-titan
**Scope:** Owner/independent-reviewer decision packet and exact evidence collection.
**Change permission:** Source-only. No authenticated cloud access, customer data, credential, DNS, IAM, PostgreSQL privilege or financial operation is authorised.

## Verified source boundaries

| Component | Repository evidence | Present design | Operational gap |
|---|---|---|---|
| Staging Terraform | infrastructure/staging/main.tf | Provisioning default false; identity provider disabled; region europe-west2; Cloud Run internal ingress and authenticated invocation | No verified approved cloud project, network, effective IAM, firewall or deployed service |
| Validation workflow | .github/workflows/pay54-staging-deploy.yml | Read-only token, no Google Cloud authentication, no Terraform apply, no secrets or payments | GitHub rulesets, Pages settings and protected deployment environments not independently inspected |
| Account reader role | backend/db/migrations/012_account_read_role_baseline.sql | NOLOGIN, NOINHERIT, NOBYPASSRLS, no table SELECT or role membership | Live PostgreSQL instance, owner and role privileges not verified |
| Account restrictive policies | backend/db/migrations/013_account_rls_denial.sql | Three RESTRICTIVE SELECT USING(false) policies | Real RLS policies and negative cross-tenant tests unverified |
| Account context backend | backend/http/account-context-handler.mjs | Unmounted, read-only, account-scoped handler | No authenticated production API mount or session switching |
| Account read race | backend/domain/account-context-reader.mjs | Checks authenticated identity before and after awaited query | No independently attested real session, TLS or database transaction atomicity |
| Catalog evidence query | backend/db/account-rls-baseline-evidence.mjs | Read-only SQL to inspect real role/table-policy metadata and reject unexpected grants | Query has not been executed against independently attested private staging |

## Owner and independent reviewer checklist

| Gate | Responsible reviewer | Required independently witnessed evidence | Pass condition |
|---|---|---|---|
| R1: GitHub Pages | Founder / DevSecOps | Exact Pages source, URL, selected branch/folder and actual deployed artifact inventory | No unintended backup, source, key or private contents exposed |
| R2: Release protections | Founder / DevSecOps | Repository rulesets, required tests, approval bypass, protected environments, reviewers | Independently enforced release separation |
| R3: Trusted CI | Security | Verified full pinned Action SHAs and source provenance; only approved OIDC claims and minimum permissions | No mutable/unreviewed privileged execution |
| R4: Cloud staging | Cloud / Security | Existing Google Cloud project identity, number, region, budget, inventory and nonoverlapping CIDR | Project/account/network approved before plan or provisioning |
| R5: Network perimeter | Network Security | Effective ingress, egress, DNS, IPv4/IPv6, hierarchical firewall and platform bypass negatives | No unintended public ingress or egress |
| R6: Credential custody | Security | Verified TLS server peer, rotation, least-privilege service identity, vault and incident procedure | No credentials in public repo or untrusted build logs |
| R7: DB role and RLS | Independent DBA | Catalog query results from the actual approved DB role, migration hashes, row policy and grants, negative tenant attempts | Exact expected deny baseline; no login, bypass, SELECT or role escalation |
| R8: Durable audit | Security / Compliance | Proof of independent audit sink, immutable receipts, retention, reconciliation and outage handling | Failed audit cannot silently produce authorised customer access |
| R9: Revocation/cross-tab | QA / Backend | Real authenticated session tests, revoke and switch race, stale data, account membership changes, cross-tenant denial | No leakage across Personal/Business accounts |
| R10: Change authority | Founder / Release Manager | Signed scope, role segregation, rollback, incident contact and release authorisation | Explicit narrow approval; otherwise no action |

## Safe evidence collection order

1. Founder or delegated administrator reviews Pages, branch rules and environments in GitHub settings, recording sanitised screenshots/exports outside the public repository.
2. DevSecOps and Security confirm the approved staging project and network context without creating resources or accessing customer financial data.
3. Independent DBA examines current catalog metadata, connection identity, effective role privileges and migration hashes using a separately authorised read-only session. The source-only catalog SQL in \`account-rls-baseline-evidence.mjs\` is an input, **not** independent proof.
4. Independent Security validates the actual credential and TLS/network trust chain, role impersonation restrictions, RLS tenant separation and rollback after denial tests.
5. Only then present a narrow, separately signed change request for private staging deployment and authenticated account-context service activation. This approval cannot automatically authorise live payment processing.

## Current stop-line and change requests

**CR-STG-12-01:** Owner-approved staging environment and immutable trusted deployer. Pending real account/project review.

**CR-DB-12-01:** Independent live PostgreSQL RLS/role and durable audit verification. No read-role permission changes without reviewed migration and specific grant approval.

**CR-ACC-12-01:** Server-side Personal/Business context selection, account data APIs, session revocation/CSRF and backend audit. Blocked on CR-STG-12-01 and CR-DB-12-01.

**CR-WAL-12-01:** Account-scoped, trustworthy ledger snapshots for Balance Movement. Blocked on real account access and reconciliation proof.

**CR-FX-12-01:** Country-eligible PAY54-to-PAY54 and bank payout integration, licensed providers and corridor-specific regulatory sign-off. Separate from account identity work.

**Production release:** NO-GO. **Staging infrastructure promotion:** NOT AUTHORISED. **Customer database SELECT:** DISABLED. **Real money/crypto execution:** DISABLED.

The task board in \`docs/engineering/pay54-cto-task-board.md\` remains authoritative for the wider workstreams, including the necessary Founder decisions.
