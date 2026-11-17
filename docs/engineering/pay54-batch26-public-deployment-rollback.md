# PAY54 Batch 26 / 1054 — Public Website Rollback and Recovery Protocol

**State:** operator runbook, not a completed disaster-recovery drill.

## Before a public website release

Secure an independently verified known-good static artifact with exact SHA-256 and commit SHA. Confirm it contains only reviewed assets, no development financial provider, private source, environment variables or source maps. Record and protect the associated known-good deployment settings and DNS/certificate state. The Batch26 rollback policy refuses reuse of the candidate SHA as the known-good revision.

Attach protected release change approval, signed reviewer evidence, monitoring owner and an on-call incident contact. Verify staging deployment with real HTTPS and an approved non-financial account view. A staging 200 does not imply an authorised financial launch.

## Failure and recovery

On a private-source exposure, incorrect card-provider inclusion, compromised deployer or failed smoke test, the Release Manager stops promotion. Security determines whether customer impact or credential exposure occurred. Deploy the independently approved known-good artifact through authorised protected workflow only; do not bypass required reviews. Verify source/header/status checks and artifact hash from an independent network perspective. Confirm CDN cache and relevant DNS TTL behaviour; preserve original incident/deployment history.

Reject any rollback that mutates banking ledger, settles payments, changes customer account state or silently rewinds database schema. Database PITR and ledger reconciliation require separate DBA/Fintech recovery playbooks.

## Closure requirements

Evidence must include previous/candidate SHA, independent artifact hashes, deployment IDs, rollback time, DNS/TLS checks, fresh public artifact inspection, reviewer signoff and incident references. The source-only evidence functions do not conduct this drill.

**Current verdict:** protected Pages deployment and rollback still unverified; production NO-GO.