# PAY54 Batch 07 — Authenticated database identity and RLS design decision

**Decision:** KEEP DATABASE CUSTOMER ACCESS DENIED. **Date:** 2026-11-15.

## Trust model

1. Browser account identifiers, access headers, custom PostgreSQL GUCs (`current_setting`) and temporary account selections are **never trusted identity sources**. PostgreSQL clients can set ordinary custom GUCs; they cannot establish authentication.
2. A verified PAY54 server principal requires the existing pinned Ed25519 JWS and fresh backend revocation check. Its binding to an account requires a currently ACTIVE membership and VERIFIED+ACTIVE account.
3. The PAY54 `pay54_account_reader_role` remains `NOLOGIN`, with no members or `SELECT` grants. Migration 013 contains restrictive `USING(false)` policies. Batch 07 will **not** replace them with permissive policies.
4. A future deployment must choose one of: (a) separately authenticated database roles with narrow RLS that cannot be impersonated across requests; or (b) separately security-reviewed trusted `SECURITY DEFINER` interfaces that bind validated principal parameters to server identity without allowing arbitrary client impersonation. Both require authenticated transport, protected role boundaries and an independent security review.
5. The present prototype uses a separate verified-principal read-only transaction per operation. Source-only allowlisted SQL and query parameters are defense in depth, not sufficient isolation when a privileged DB login is misconfigured.
6. No financial posting, wallet mutation, customer record provisioning, regulated operations or live UI account switching is authorised.

## Design acceptance before any customer data access

- No role with SUPERUSER, BYPASSRLS, direct financial posting or broad table ownership can serve account requests.
- Account context, membership, wallet binding and business tenant policies deny cross-account and cross-user data.
- Connection-pool release, rollback, revocation freshness, audit delivery and cross-tenant negative tests pass in a realistic staging environment with real least-privilege login credentials.
- Reviewer independently inspects PostgreSQL `pg_roles`, `pg_auth_members`, `pg_policy`, table grants and effective network policy, not just code snippets.
- KYC/KYB, payment-provider approval, UK/Nigeria regulatory requirements, STG-01..07 and independent release gates remain mandatory.

**Status:** DESIGN ONLY. Staging release BLOCKED; cloud provisioning DISABLED; financial execution DISABLED.
