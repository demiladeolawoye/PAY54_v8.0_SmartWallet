# PAY54 Project Titan — Batch 10 item 235: audit durability and disclosure security review

**Status:** SOURCE-ONLY, NOT OPERATIONALLY VERIFIED  
**Scope:** Account list/select display paths; no monetary execution, database grants, cloud provisioning, or live credentials.

## Verified code contracts (not equivalent to durable storage)

- Batch 09 already included a minimal audited account read boundary in `backend/security/account-read-audit-gate.mjs` and `backend/security/account-audit-envelope.mjs`, but its sink callback could resolve without supplying a durable acknowledgement.
- Batch 10 adds `backend/security/account-audit-receipt-gate.mjs`, `backend/security/account-receipt-audited-read.mjs` and their adversarial tests. These source-only interfaces require a matching event ID and explicit `accepted: true` and `persistenceConfirmed: true` acknowledgement before releasing display-only data.
- The receipt event contains only fixed schema, event ID, operation, outcome, reason and financial-execution-disabled flag. Account IDs, balances, principal IDs, subject tokens, connection strings, addresses and request payloads are excluded.
- A failed read, sink outage, missing/false/mismatched acknowledgement, or delayed failed acknowledgement returns a generic `ACCOUNT_READ_DENIED`. No audit event contains the original exception.
- A successful acknowledgement remains `sourceAckOnly: true` and `durableStorageIndependentlyVerified: false`. An injected callback **can lie**. That callback is neither a trusted proof of durability nor suitable for mounting directly to real customer data.

## Unresolved engineering and threat controls

| Control | Required independent operational evidence | Current assessment |
|---|---|---|
| Append-only storage | Provider-side write-once policy, tamper detection and anti-deletion privileges | MISSING |
| Durable receipt | Persisted event reference checked by an independent reader under outage injection | MISSING |
| Key custody | Short-lived workload-bound credentials and non-shared trust anchors | MISSING |
| Event integrity | Verifiable digest/signature chain and independent write ordering | MISSING |
| Temporal ordering | Correlated authenticated account read, revocation checks, and event commit | MISSING |
| Replay / duplication | Event ID idempotency and duplicate-denial handling | MISSING |
| Retention | Approved jurisdiction-aware compliance retention schedule | MISSING |
| Reconciliation | Completeness check vs access decisions, anomaly alerts, and recovery exercise | MISSING |
| Resilience | Backpressure, retry bounds, fail-closed read unavailability, disaster recovery | MISSING |
| Personal data | UK GDPR minimisation and processor/security assessment | MISSING |
| Audit access | Investigator least privilege, separation of duties and traceable reads | MISSING |

## Operational proposal requiring separate approval

Place a dedicated audit writer behind least-privilege workload identity, use an append-only store with independent verification and testable write receipts, establish idempotent event identifiers, then perform privacy, chaos and data-retention reviews. Keep audit write path separate from financial posting, and use independent immutable evidence before accepting its write results. Do not enable positive customer SELECT or real financial flows on the strength of source-only receipt tests.

## Publication and branch policy risk

Repository `project-titan` currently invokes GitHub-managed **pages build and deployment** on source-only commits, including successful run `43860275827` at documentation commit `db3f0da250eeb8f65b1781a6e2495611cee61544`. No explicit Pages workflow exists among the enumerated `.github/workflows/pay54-*.yml` files. The current observation is consistent with repository Pages settings, but the precise publication source, custom-domain mapping and branch protection were **not verified** from administrative settings.

**Founder/DevSecOps approval boundary:** A separate change request should inspect Settings → Pages and protected environments, confirm which repository folder/branch is being published, disable unintended public distribution of engineering material where needed, and establish a dedicated release identity with least-privilege OIDC. Do not change these settings or create cloud IAM under the Batch 10 source-only approval.

**Decision:** All live account data reads, audit claims, deployment promotion and monetary transactions remain BLOCKED pending independent review, infrastructure evidence and separate Founder authorisation.
