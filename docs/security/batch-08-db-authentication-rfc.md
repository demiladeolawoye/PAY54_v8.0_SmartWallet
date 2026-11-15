# PAY54 Security RFC — Authenticated database actor identity (Batch 08)

**Decision:** Develop a disposable PostgreSQL *role-authenticated* proof of tenant-level RLS. **Do not replace live account-denial policies.**

## Threat, trust and design constraints

PostgreSQL `current_user` reflects the *effective database role* (which can change through `SET ROLE` for roles the session is permitted to assume), whereas custom `current_setting('pay54.subject')` may be set by an untrusted SQL caller. The latter must **never** be treated as authentication. For a production design, the service's authenticated JWT principal must be mapped to a role or narrowly constrained trusted server-side entrypoint whose caller cannot assume arbitrary tenant privileges.

The proposed proof uses two fresh, **NOLOGIN** test-tenant roles and a test-only table in a disposable PostgreSQL database, with an RLS policy restricting rows to the effective actor role. A privileged CI operator simulates those actors with `SET ROLE`; this is **not** production authentication and cannot prove a production service's credential separation. Test-only grants occur inside rolled-back transactions. This prototype is **not** an account read migration and does not grant `pay54_account_reader_role` access.

### Required production boundary

A future database identity system must have a security-reviewed mapping from verified server session subject to an isolated, authorised database role, no public/financial role switching, no broad membership, no BYPASSRLS, audited credential lifecycle, TLS/pool isolation, revocation checks and an independent permission matrix. Do not use client-writable GUCs for trusted identity or an arbitrary account ID as authority. A role chosen through `SET ROLE` is trustworthy *only if the connection and role membership prevent client selection of other tenants*. A privileged shared service login able to switch to all tenant roles **does not** establish this property and would require another trust boundary.

An alternative controlled privileged stored-function architecture would require a separate reviewed `SECURITY DEFINER` design with input validation, pinned search path, minimal definer rights and a demonstrably nonspoofable caller identity; none is authorised here.

**Not in scope:** Production policy replacement, positive grants against PAY54 customer tables, credentials, live queries, money execution, Cloud provisioning, release, KYB or account switching.

**Status:** Source-only architectural proof. Independent security approval OUTSTANDING; production/staging BLOCKED.
