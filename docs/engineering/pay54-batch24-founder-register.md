# PAY54 CTO — Batch 24 Founder Register and Change Requests

**Cycle:** Batch 24, implementations 918–967, 50 numbered source engineering actions (including tests, security corrections and governance).
**Review:** Draft PR #12 stacked on Draft PR #11, neither merged.
**Release:** NO-GO. No customer data, staging/production database, real IDP, login endpoint, Pages deployment or live funds touched.

## Engineering ledger

| IDs | Source result | Operational acceptance |
| --- | --- | --- |
| 918–919 | Trusted short-lived signed access-token verification and adversarial tests | Real IdP trust root/contract not provisioned |
| 920–921 | Strict same-origin identity ingress and forged actor denial | No public endpoint |
| 922–925 | Additive migration 019 unique issuer/JTI one-time receipt + unbound bootstrap session, SQL success/replay/privilege tests | Disposable PostgreSQL only |
| 926–928 | Pinned Batch24 isolated CI and server-only identity-to-DB issuer adapter with negative tests | No staging write pool |
| 929–932 | SQL denial for malformed assertion, cross-principal replay, RLS credential read and direct DML | No real identities |
| 933–937 | Additive migration 020 first authorised account binding and SQL replay, tenant, privilege tests | Function not deployed |
| 938–939 | Reused hardened account transition adapter for first bind, preserving Batch 23 APIs and tests | No UI/session endpoint |
| 940–941 | Uncertain bootstrap COMMIT recovery requires new signed reauthentication; negative tests | Recovery service not connected |
| 942–943 | Bounded/no-cookie HTTP framing admission, duplicate-header/oversize tests | Future routing only |
| 944–945 | Redacted identity security telemetry allowlist and log-leak negatives | Monitoring pipeline not provisioned |
| 946–947 | External distributed atomic rate-limit contract with outage denial tests | Real distributed store not connected |
| 948–949 | Identity public-key overlap/retirement and clock boundary tests | Operational key rotation not performed |
| 950–954 | Concurrent replay SQL test, digest/receipt rollback and membership/ACL denial; CI concurrency integration | Synthetic DB evidence only |
| 955–956 | Canonical 001–020 migration source guard and adversarial tests | Signed DBA migration review required |
| 957–958 | Staging-only public Ed25519 trust configuration and negative tests | No real customer issuer provisioned |
| 959–960 | Full signed-assertion-to-issuer Node test and live loopback HTTP nonactivation check | No live authentication |
| 961–967 | Architecture ADR, staging SOP, recovery runbook, QA matrix, release gates, founder register and closure | Human operational evidence pending |

Numbered engineering actions are **not** equivalent to 50 new app features or deployment-ready banking capabilities.

## Outstanding change requests

| ID | Priority | Action | Owner | State |
| --- | --- | --- | --- | --- |
| CR-IDENTITY-01 | P0 | Connect approved identity provider, implement true customer auth/reauth/MFA, secret/JWKS/KMS management | Founder / Security / Backend | NOT PROVISIONED |
| CR-ACCOUNT-02 | P0 | Secure authenticated Account Directory and Personal/Business switch route, old token revocation and cache isolation | Backend / Mobile / Security | 503 FAIL-CLOSED |
| CR-DB-01 | P0 | Independently controlled staging PostgreSQL, migrations 001–020, actual role mappings, RLS pen test/PITR | DBA / DevSecOps | NOT DEPLOYED |
| CR-RATE-01 | P0 | Distributed atomic authentication rate limiting, abuse prevention and observability | Security / SRE | NOT DEPLOYED |
| CR-PAGES-01 | P0 | Verify current published Pages artifact; contain historical backend/docs overpacking and any exposed sensitive content | DevSecOps / Security | OPEN |
| CR-CARD-01 | P0 | Remove/disable linked-card development provider until contracted partner approved without funding regression | Fintech Architect / Frontend | OPEN |
| CR-DEPLOY-01 | P0 | Verify protected GitHub rulesets, OIDC deployment identity, restricted Pages publishing and rollback | Release / DevSecOps | PENDING |
| CR-FINTECH-01 | P0 | UK–Nigeria contracts, KYC/KYB/AML, safeguarding, FX settlement, reconciliation and complaints | Founder / Compliance | OPEN |
| CR-QA-01 | P1 | Real device, multi-tab/slow network and accessibility QA with actual RLS/account data isolation | QA / Mobile / UX | PENDING |
| CR-OBS-01 | P1 | Durable security audit, redacted logs, breach response, retention and forced reauth after uncertain COMMIT | Security / SRE | PENDING |

## CTO decision

Keep PR #12 draft and unmerged. Do not grant database logins, publish API routes, connect live payment rails or promote code solely because synthetic tests pass. Review the exact final SHA and require independent Founder, Security, DBA, Compliance and Release signoff for any operational change.

**Source cycle can be complete while PAY54 remains production NO-GO.**
