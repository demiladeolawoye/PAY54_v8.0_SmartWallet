# PAY54 Batch 09 — Database actor provenance and role trust

**Architecture decision:** No customer-data grants or positive RLS deployment in Batch 09. Use source-only inspection and disposable PostgreSQL ACL tests.

The current Batch 08 actor check compares `current_user` with server-approved role metadata. This alone **does not prove database authentication**: privileged sessions can `SET ROLE`, and a tenant role can inherit rights or have unintended memberships. Future live connections must be proven to originate from a non-switchable, least-privilege credential with exact actor, role attributes and explicit access scopes. The proof should inspect `session_user`, `current_user`, the effective role's flags and role memberships, without accepting caller supplied SQL GUCs as trusted principal. A production role mapping must not allow one connection to impersonate another customer.

A candidate approach is isolated per-tenant database identities with TLS credential isolation and a constrained pool, but operational overhead and identity rotation require an independent design decision. A shared privileged pool capable of assuming every tenant identity is unacceptable absent a separately approved trusted execution layer. Dynamic `SET ROLE` by a generic API connection is **not** a trust boundary.

Batch 09 introduces immutable role policy, SQL attestation catalog, connection-provenance and quarantine contracts; none opens a database pool, provisions identities, stores credentials, mounts APIs or authorises financial execution. SQL tests use test-created actor roles and synthetic data inside a rollback transaction. Existing PAY54 migrations 001–013, denial policies and dormant NOLOGIN reader role remain unchanged.

**Independent signoffs missing:** role and credential custody, principal→role provisioning, cross-tenant positive and negative RLS policies, real session revocation, durable audit, pen test, KYC/KYB, UK/Nigeria provider readiness, STG-05 effective cloud network and production change approval.

**Release:** BLOCKED. **Cloud provisioning:** DISABLED. **Money movement:** DISABLED. **Implementation 212:** requires new approval.
