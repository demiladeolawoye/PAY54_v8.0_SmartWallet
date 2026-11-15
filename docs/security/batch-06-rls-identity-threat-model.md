# PAY54 Batch 06 — Authenticated identity and account RLS threat model

**Status:** SOURCE DESIGN; NEVER LIVE VERIFIED. **Date:** 2026-11-15.

The account gateway must authenticate a cryptographically signed, pinned-key Ed25519 session before resolving a server-trusted principal. A valid signature alone is insufficient: the issuer, audience, subject, issuance, not-before, expiry, key status and revocation state must all be checked. Session documents and account IDs supplied in requests are not authority. JWT-like signatures are not payment approval or a user authentication product by themselves.

The PostgreSQL `pay54_account_reader_role` remains **NOLOGIN with no members or SELECT grants**. Batch 06 adds only explicit deny policies as defense in depth. Do not create RLS policies that trust a caller-writable `current_setting('pay54.subject_id')`: custom PostgreSQL settings are generally client-settable and are not authentication. Before any real RLS grant, independently design an authenticated transaction identity binding, least-privilege SQL role, pooled connections, revocation freshness, hierarchy policy interactions and cross-tenant tests. No migration here authorises reads.

Threats: signature algorithm confusion, key-substitution and rotation bypass, forged issuer/audience, expiration/clock skew abuse, stale revocation, tenant ID substitution, response caching, SQL session variable spoofing, timing/error enumeration, RLS BYPASSRLS/superuser, unscoped wallet joins, audit/log leaks, replayed browser sessions and financial settlement confusion. All remain operationally OPEN. Source tests are evidence of code behavior only.

**Release:** STG-01..STG-07 outstanding; cloud provisioning and money execution disabled; no live route is mounted.
