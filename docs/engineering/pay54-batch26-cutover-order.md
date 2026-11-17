# PAY54 Batch 26 / 1064 — Dependency-Ordered Path to Launch

**Architectural order:** Core → Infrastructure → Services → Engines → Modules → UI → Dashboard → Mobile Apps → Production. Keep working PAY54 preview features intact and avoid duplicate business logic.

## Critical path

1. **Contain and understand the current site:** authenticated GitHub Pages settings, artifact inventory and historical exposure investigation. If an active risk exists, separate Security incident remediation from feature work.
2. **Protect the release chain:** correct default branch rulesets, privileged reviewers, narrowly scoped cloud deployer, OIDC, separate environments, immutable reviewed static artifact and actual rollback.
3. **Build real staging foundation:** independent cloud/IAM/secret manager, private PostgreSQL, 001–020 migrations, four isolated effective roles, TLS, RLS, PITR, security evidence and observed SRE metrics.
4. **Contract identity and risk providers:** signed customer authentication/reauth/MFA, key governance, KYC/KYB/AML and real distributed rate limit.
5. **Connect protected account APIs:** server-scoped Account Directory, Personal/Business switching, audited session rotation and ten-domain cache isolation after independent staging proof.
6. **Connect contracted UK–Nigeria rails:** UK bank inbound, global backbone, two distinct Nigeria payout providers, actual FX and funds-flow/safeguarding arrangements; do not expose uncontracted product choices.
7. **Replace development card provider:** approved PSP/issuer with PCI/3DS/SCA, refunds, chargebacks, ledger reconciliation and tested provider failure response.
8. **Full acceptance:** real iOS/Android/browser and accessibility QA, operational threat drills, independent Security/DBA/Compliance approvals, release/rollback evidence and monitored restricted launch.

## Progress accounting

Batches 1–26 are implementation-numbered source workstreams; their completion is separate from actual staging/production acceptance. The latest two completed source batches are stacked **draft PRs** and have not been promoted by this document.

**Next recommendation:** Batch 27 should focus on observable real operational evidence intake once authorised access is available, with priority on Pages containment, staging validation, and a contracted identity/payment partner. If no such access or contract exists, continue hardening source and negative tests without claiming live functionality.