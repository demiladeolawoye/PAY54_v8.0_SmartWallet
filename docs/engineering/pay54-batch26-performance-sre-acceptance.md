# PAY54 Batch 26 / 1062 — Performance, Observability and Incident Acceptance

**Scope:** operational planning for eventual staging, not a current performance benchmark.

Measure p50/p95/p99 verified identity-login latency, server signature verification CPU, distributed limiter latency/error rate, database pool saturation, serializable retry/lock contention, RLS rejection patterns, audit write latency, first Personal/Business account-binding time and cache invalidation races. Collect separate card/network-provider quote, authorisation, 3DS, webhook, FX settlement and reconciliation metrics only after regulated sandbox contracts.

Use synthetic noncustomer data, redacted correlation IDs and agreed partner rate caps. Never load-test live bank/card rails or create real payment requests without explicit approval. Do not infer fintech capacity from static website throughput or mock successful payments.

Failure injections should include one IdP signing key retired mid-session, distributed limiter outage, lost PostgreSQL COMMIT acknowledgement, revoked membership, two concurrent JTI redemptions, active-account stale read, operator-triggered Pages rollback, webhook replay, FX stale price and partner outage. Validate incident pages, audit continuity and recovery by independent operators.

Performance service-level objectives and alert thresholds must be set from measured real staging workloads and contractual partner limits. Metrics claiming a go-live capacity without staging proof remain NOT_VERIFIED.

**Current state:** no production/staging SLO met or claimed, CR-QA-01 and CR-OBS-01 OPEN.