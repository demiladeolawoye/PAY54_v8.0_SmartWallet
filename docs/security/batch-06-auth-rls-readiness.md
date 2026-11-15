# PAY54 EEO — Batch 06 Authentication and RLS Security Readiness Packet

**Prepared:** 2026-11-15  
**Branch:** `project-titan`  
**Scope:** User-authorised source-only implementations 92–120  
**Formal independent security approval:** NOT OBTAINED  
**Financial execution:** DISABLED · **Cloud provisioning:** DISABLED · **Staging/production release:** BLOCKED

## Executive decision

Batch 06 builds an isolated backend authentication proof-of-contract alongside explicit PostgreSQL **deny-only** account row-security policies. It does **not** grant permission to read accounts, deploy sessions, open APIs or transfer funds. This distinction must remain visible in all engineering status reports.

## Source architecture

| Boundary | Source implementation | Security guarantee | Limitations |
|---|---|---|---|
| Public key trust | `backend/security/account-trust-key-policy.mjs` | Local pinned Ed25519 public keys, explicitly ACTIVE/RETIRED | No KMS/JWKS, incident rotation runbook or independent issuer ownership audit |
| Signed claims | `backend/security/account-jws-verifier.mjs` | Strict compact JWS, EdDSA signature, issuer/audience, typed UUID subject/jti, bounded times | Not mounted; no browser or mobile login product; requires approved key distribution |
| Revocation | `backend/security/account-session-revocation.mjs` | Backend callback must return exactly false to continue; unavailable status fails closed | No real durable revocation store, token-family rotation or logout broadcast |
| Principal adapter | `backend/security/account-session-adapter.mjs` | Signed verifier feeds the existing opaque server-trusted principal resolver | Injected extractor is not itself session transport or cookie validation |
| SQL RLS | `backend/db/migrations/013_account_rls_denial.sql` | Restrictive false SELECT policies for three account relations, no SELECT grants | Does not activate safe tenant-specific access or account logins |
| Tenant policy | `backend/domain/account-tenant-boundary.mjs` | Account ID and principal membership must match and remain active | Defence in depth, not independently authenticated SQL row policy |
| Capability policy | `backend/domain/account-capability-grants.mjs` | Roles inform view/initiate/approve eligibility but financial execution is false | Does not implement financial maker/checker transaction approval |
| Browser origin checks | `backend/security/account-csrf-policy.mjs` | Explicit HTTPS origin matching for preview | Unmounted; not a production CSRF token/cookie scheme |
| HTTP disclosure | `backend/http/account-auth-response.mjs` | Minimal selected account display fields only | No live endpoint, no balance/card/transaction access |
| Audit correlation | `backend/security/account-audit-correlation.mjs` | Locally generated audit request correlation without copying session/user IDs | No real durable audit storage, logging API or customer-data retention |
| Offline governance | `backend/governance/account-rls-audit.mjs`, `account-auth-security.mjs` | Mutation-tested guards flag weakened source controls | Does not attest live cloud, cryptographic key custody or DB settings |

## Cryptographic and regulatory gates outstanding

1. Independent verification of session issuer ownership, signing-key custody, rotation, compromise recovery, algorithm policy, JTI uniqueness and revocation latency.
2. Real login/session establishment and safe token extraction from approved transport, including cookie SameSite/HttpOnly/Secure, CSRF tokens, replay resistance and request-rate controls.
3. Authenticated PostgreSQL RLS design that cannot be forged through caller-controlled `current_setting`, untrusted SQL role membership, connection pool reuse or BYPASSRLS privileges. Current reader role is NOLOGIN/zero-data-access.
4. End-to-end UK/Nigeria identity, consumer KYC, business KYB, ownership/beneficial-owner checks, operator roles and independent threat review.
5. External audit sink durability, access controls, retention, correlation, redaction and incident alerting.
6. Real request/response account, wallet and transaction isolation; internal money engines and ledger posting are deliberately unchanged.
7. STG-01..STG-07 governance, Google Cloud effective network policies, budget and independently approved release signoff.

## Test basis

The isolated PostgreSQL 16 workflows create disposable schemas from migrations 001–013, test RLS policy identities and restricted-role privilege denial, and re-run legacy account/ledger regressions. Node tests use generated ephemeral Ed25519 keypairs to verify positive claims and negative wrong-key, unsigned, expired, revoked, untrusted and tampered cases. Each test has a fresh synthetic principal; no PAY54 customer information is required.

**No production/private key or credential is stored in this repository by Batch 06.** The key fixtures are generated at test runtime.

## Decision boundary

**SOURCE_IMPLEMENTED / CI_REQUIRED / NOT_DEPLOYED.** Do not connect or activate the new verifier, migrate live databases, grant SELECT, create LOGIN roles, mount account endpoints or enable any real-money feature without a dedicated subsequent architectural and security approval. Approvals for source-only item 121 do not authorise item 122.

Independent security reviewer identity, signature, cloud screenshots, runtime penetration testing and regulatory signoff remain OPEN.
