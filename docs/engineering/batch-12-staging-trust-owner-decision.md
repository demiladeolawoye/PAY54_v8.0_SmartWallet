# PAY54 Batch 12 — Private Staging Trust Decision (Item 362)

**Date:** 2026-11-16
**Branch:** project-titan
**Release decision:** SOURCE-ONLY, no operational authorisation.

## GitHub owner verification findings

The read-only GitHub repository rulesets listing returned an empty array. This does not prove older per-branch protection settings are absent. The branch-protection endpoint returned HTTP 403: Resource not accessible by integration. The available GitHub connection also cannot independently verify the Pages settings and published artefacts. Accordingly the actual security status is UNKNOWN, not protected or unprotected.

The repository owner must inspect Settings > Rules > Rulesets; Settings > Branches; Settings > Environments; and Settings > Pages. Record required reviewers, restrictions on direct pushes and bypasses, status checks, Pages source and a reviewed public asset inventory. Store sanitized evidence privately, never credentials in a public repository.

## Source-level database improvements

Items 360–361 strengthen the existing PostgreSQL account-read baseline inspection. Its catalog SQL checks the three account-bearing relations, forced RLS and restrictive denial, plus all PostgreSQL table privileges relevant to readers: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER, and direct account-table ownership. The updated tests reject each unexpected privilege, a failed denial policy, missing catalog evidence and elevated role properties.

This is not a live database attestation. No PostgreSQL query was run against a real PAY54 environment.

## Operational acceptance gates

| Gate | Owner | Evidence required | State |
|---|---|---|---|
| Repository branch/Pages | Founder + DevSecOps | Verified branch protection, protected environments, actual published assets | UNKNOWN |
| Trusted deployer | DevSecOps + Security | Approved least-privilege identity, verified upstream Action pins and OIDC trust | NOT AUTHORISED |
| Cloud staging | Cloud + Security | Exact project and billing controls, Terraform reviewed plan, effective private ingress/egress and rollback | NOT PROVISIONED |
| DB credentials | DBA + Security | Verified PostgreSQL peer/TLS, vault custody, rotation, effective role | NOT VERIFIED |
| Tenant RLS | Independent DBA | Authoritative catalog results, cross-tenant negative reads, grants and durable audit | NOT VERIFIED |
| Live account switching | Backend + QA | Server-session context, role checks, CSRF, account scope, multi-tab revocation and audit | DISABLED |
| Money movement | Fintech + Compliance | Partner contracts, lawful rail, safeguarding and reconciliation | DISABLED |
| Staging release | Founder + Release Manager | Separate, signed and scoped authorisation | BLOCKED |

## Recommended order

First, the Founder supplies sanitized evidence of repository branch and Pages settings, without sharing secrets. Second, an independent DBA/security reviewer confirms the actual database role and RLS deny baseline. Third, agree a private-staging deployment design, cost limits and rollback. Only then request separate approval to provision cloud infrastructure, issue deployer credentials or enable server-side account switching.

No IAM role was granted, database permission relaxed, GitHub setting modified, customer account accessed, financial transaction submitted, or live infrastructure provisioned under this milestone.
