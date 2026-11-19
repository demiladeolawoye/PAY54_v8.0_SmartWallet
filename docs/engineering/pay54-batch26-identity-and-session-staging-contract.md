# PAY54 Batch 26 / 1055 — Controlled Staging Identity/Session Integration Contract

**Status:** future real staging acceptance. No identity provider, issuer pool, customer login or MFA is active.

1. Approve identity provider contract, UK/Nigeria GDPR/data protection processing, KYC/KYB responsibilities, step-up MFA and recovery flow. Select a provider that can produce a strict PAY54-specific EdDSA `at+jwt` assertion with pinned issuer/audience and unique JTI for session issuance; do not accept generic ID tokens.
2. The trusted service must verify token cryptography and lifetime with independently provisioned Ed25519 public keys. Batch26 records an overlapping key-window plan, but actual revocation and key-rotation propagation remain unverified.
3. Provision separate staging PostgreSQL connections for session read, account read, account transition and bootstrap issuance using secret-manager-backed rotated credentials. Restrict each effective callable role and the two NOLOGIN function owners. Never grant SQL access to browsers.
4. Execute independently reviewed migrations 001–020; verify original RLS, membership semantics, account audit, session revocation and unique assertion JTI under real PostgreSQL role-to-login mapping.
5. Connect a real distributed atomic rate limiter and account lifecycle telemetry before enabling any future login route. Deny by default during store outage, failed cryptographic verification, ambiguous COMMIT or stale session context.
6. Initial account binding must rotate the unbound bootstrap token, choose an existing server-authorised Personal/Business membership and append audit in one database transaction. Subsequent account switching must also clear or refresh all account-specific data domains before showing balances.
7. Complete cross-user, multi-tab, mobile background/offline, CSRF, credential revocation, RLS leakage, webhook, latency and accessibility QA with independently recorded evidence.

**Staging trial requires separate Founder/Security/DBA/Release signoff. Production requires additional regulated Compliance/partner approval.**