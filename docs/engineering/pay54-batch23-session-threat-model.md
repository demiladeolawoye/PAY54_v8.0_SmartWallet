# PAY54 Batch 23 / 912 — Session and Tenant Isolation Threat Model

**Assessment:** Source-only architecture threat model; not a production penetration test.
**Trust boundaries:** browser → HTTP authentication perimeter → separately provisioned credential reader → canonical PostgreSQL RLS account reader → isolated function-only rotation caller → restricted SECURITY DEFINER executor → session/audit tables → account-bound caches and wallet/ledger.

| Threat | Impact | Source control already established | Residual operational blocker |
| --- | --- | --- | --- |
| Browser fabricates principal, role or Business ID | Account takeover, cross-tenant reads | Strict request parser, server-derived session principal and membership RLS | Real authenticated identity provider and session ingress not provisioned |
| Stolen bearer token | Unauthorised access until expiry/revocation | 256-bit random bearer digests, transaction-local credential RLS, expiry and rotation revocation | Device binding, rate limiting, anomaly detection and credential issuance policy |
| CSRF or origin spoofing | Attacker-directed account context | Canonical HTTPS origin check, 256-bit CSRF secret digest check in trusted SQL | Actual HTTPS ingress/cookie SameSite/session binding not deployed |
| Old token replay and concurrent switch | Double-issued session, conflicting balances | Row-level lock, expected-version CAS, old-row revoke, unique digest and session index, two-client concurrency test | Real multi-region/failover chaos and retry semantics not accepted |
| Forged PostgreSQL actor GUC | Cross-tenant read/write | Session principal loaded under credential RLS; function overwrites actor; account RLS and membership checks | SQL role grants/DBA security review and real independent staging tenants |
| Direct session-role table DML | Arbitrary token creation, audit forgery | Callable role has only EXECUTE, dedicated non-login/no-bypass function owner has minimal table rights; negative SQL tests | Source schema not deployed; independently test role-to-login grants |
| Superuser SECURITY DEFINER | Bypassed RLS, privilege escalation | Definer owned by separate NOLOGIN/NOBYPASSRLS role with fixed search_path and no CREATE on schema post-migration | Verify actual pg_catalog owner, ACL, function volatility and extension attack surface |
| Session not audited atomically | Untraceable account switch | Single SQL transaction revokes old, inserts new and appends audit; collision rollback tests | Immutable operational audit forwarding, monitoring and incident playbook |
| Failed COMMIT or broken rollback | Unknown session state; leaked replacement token | New credentials returned only after COMMIT, uncertain connection discarded | End-to-end idempotent recovery and forced reauth for uncertain outcomes |
| Cross-account caches or delayed network replies | Personal/Business data visible in wrong context | Batch 21 continuity and ten-domain evidence contracts | Live mobile/desktop instrumentation, cache partitions and abort/reload tests |
| Public Pages artifact includes backend/source | Security and architectural disclosure | Candidate artifact scanner, prior Pages packaging findings | Current published artifact and reachability not independently verified |
| Provider/regulated rails activated prematurely | Fund loss, regulatory breach | Financial endpoints deliberately return 503 | Licensing/contracts, KYC/KYB/AML, reconciliation and safeguarding acceptance |

## Mandatory abuse-case acceptance

Use two distinct staging principals with one Personal account each and a shared Business viewer/owner separation. Attempt cross-principal account reads, old-token replay, forged GUC, CSRF mismatch, role-based transfer denial, same-account rotation, double client submission, audit failure, DB failover and card/ledger lookup after context changes. Retain full redacted evidence and require independent Security sign-off.

## Residual red lines

- No use of owner/superuser roles for app sessions; no BYPASSRLS; no direct table DML for the callable rotation role.
- No browser-selected account authoritative for financial posting; journal/ledger remain permissioned independently.
- No live production account-switch endpoint until trusted identity, real DB grants, device QA, service observability, recovery and compliance acceptance are complete.
- No provider/financial execution permission derived solely from a successful account context switch.

**Overall risk:** Production NO-GO. Source-only controls do not prove effective access constraints under actual deployment, regional failover, IAM or provider conditions.
