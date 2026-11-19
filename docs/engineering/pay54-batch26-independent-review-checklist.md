# PAY54 Batch 26 / 1063 — Independent Security/Release Evidence Checklist

**No self-certified stage promotion.** A passing synthetic CI workflow validates reviewed source, not live providers or identity. An Ed25519 signature proves a statement was signed by the holder of a key, not that the statement is factually correct.

## Required independent roles

| Owner | Evidence required before operational approval |
| --- | --- |
| Founder | Business scope, staged risk acceptance, budget, approved partner selection and emergency decision authority |
| Security | Actual Pages sensitive content checks, IdP keys and MFA, security incident controls, redacted logging, penetration test, key rotation |
| DBA | Four effective PostgreSQL roles, migrations 001–020 checksums, RLS test, session audit, PITR/restore, TLS and backup encryption |
| DevSecOps | Protected GitHub rulesets, environment reviewer policy, scoped OIDC, separate deployer, signed artifact and rollback |
| Fintech Architecture | Contracted provider adapters, no simulator in real funds, correct ledger and settlement lifecycle |
| Compliance/Legal | UK–Nigeria regulated permissions, KYC/KYB/AML, sanctions responsibilities, safeguarding, complaints, data protection and partner terms |
| QA/Mobile/UX | Android/iOS/browser, cross-account leakage, stale cache, accessibility, performance, failed transaction tests |
| Release Manager | Exact final SHA all checks green, release change record, signed reviewer trace, rollback rehearsal and monitored go/no-go |

Each item must include actual authenticated environment ID, timestamp, provenance and reference to restricted evidence. Do not upload private keys or customer data to the PR. Any missing high-priority evidence maintains **NO-GO**.

The completed Batch 26 source-cycle report is not operational approval; a separate tracked staged change is required.