# PAY54 Project Titan — Batch 10 / Implementation 212
## Isolated PostgreSQL identity and credential-custody architecture decision

**Status:** SOURCE-ONLY DESIGN, NOT APPROVAL TO DEPLOY
**Baseline:** `project-titan` at `244237f65238ec8747e364176130cc2d07133f5e`
**Decision owner:** PAY54 Enterprise Engineering Office
**Security review:** Independent sign-off NOT OBTAINED
**Activation:** Explicit Founder approval and independent security review required

### 1. Existing boundary and problem
Batch 09's `account-connection-provenance.mjs` introspects `session_user`, `current_user`, role attributes, memberships and ownership; a separately supplied reviewer describes financial privilege and role-assumption capabilities. These are necessary checks but not credential provenance. A privileged shared connection can switch effective roles. A forged callback, proxy or insecure credential custody can defeat advisory source checks. A `NOLOGIN` customer reader and deny-only customer account RLS are intentionally preserved.

### 2. Chosen source-only target architecture
1. **Server identity:** Authenticate user/session at the trusted API boundary; resolve a server-side subject and authoritative account membership. Do not accept a browser-provided database role, tenant ID or session GUC as authority.
2. **Role mapping:** An independently governed provisioning control plane maps an immutable tenant/account identifier to exactly one scoped PostgreSQL LOGIN principal. Verify non-inheritance, no BYPASSRLS, no SUPERUSER, no CREATEDB/CREATEROLE/REPLICATION, no other-tenant memberships, no customer table ownership and no financial privileges.
3. **Credential source:** A workload-identity-authorised secret manager supplies scoped connection material to a single approved server component. Never store passwords in repository, client assets, logs, audit events, test fixtures or outbound telemetry. The application process must not possess provisioning administrator credentials.
4. **Connection isolation:** Establish a fresh authenticated connection or a strictly role-partitioned pool keyed by the independently verified credential identity. Do not share an authenticated PostgreSQL session across tenant roles. Do not implement `SET ROLE` or `SET SESSION AUTHORIZATION` on account read paths.
5. **TLS and server trust:** Require certificate validation and a pinned approved server identity/trust chain; deny plaintext, trust-all certificates, or permissive SSL fallback. Enforce explicit endpoint allow-list and timeouts. Rotation must invalidate old checkout leases.
6. **Database enforcement:** Verify `session_user === current_user === mapped credential role`, read-only transaction, role flags, effective grants, RLS behaviour and absence of role switching. Never treat `current_setting` of a caller-controlled GUC as an authenticated tenant identity.
7. **Post-read controls:** Require fresh membership/revocation checks and durable audit acknowledgement before disclosing account data. Deny and discard connections after error, cancellation, rollback uncertainty or epoch mismatch.
8. **Separation of duties:** Only the independently approved database provisioning identity can create/revoke tenant roles or grants. Application read identity can neither provision nor assume other tenants.

### 3. Credential-custody evidence contract
Before ANY positive customer-data read, independently verify all of the following against a real ephemeral integration environment:
- A signed and time-bounded credential descriptor bound to exact tenant, account, role, environment, endpoint identity and rotation epoch; issuer and signature verification keys are outside caller control.
- Secret-access IAM policy is deny-by-default, workload-specific, auditable and cannot fetch other-tenant credentials.
- TLS peer and hostname verification, server trust roots, certificate validity and endpoint restrictions are demonstrated with negative tests.
- PostgreSQL attestation matches both effective and authenticated roles, role attributes, memberships, ownership and grants; independent query source is protected against app-supplied fakes.
- Parallel checkout of two tenant roles never shares a physical session; contamination/reuse, cancellations, error paths and credential rotation discard the session.
- Real deny-only customer RLS remains in place until a **separately approved** positive policy and least-privilege table grants are independently reviewed.
- An external security reviewer verifies secret rotation/revocation, cross-tenant probes, restore drills, audit retention and operational alerting.

### 4. Rejected approaches
- Shared privileged API connection plus `SET ROLE` to a caller-selected tenant.
- Caller-defined `pay54.tenant_id` or other custom PostgreSQL GUC as an authorisation source.
- Trusting a boolean `reviewedRoleCapabilities` callback as proof of credential identity.
- Reusing a pooled physical connection between independent tenant credentials.
- Hardcoded PostgreSQL credentials, localStorage identity, disabled TLS validation, application superuser or implicit broad table grants.

### 5. Trade-offs and staged decision
A database LOGIN identity per tenant creates provisioning, role-count, rotation and connection-management overhead at scale. This design is a **candidate security control**, not evidence that one-tenant-per-role is operationally approved. Before operational adoption, benchmark role count, pool partitioning cost, connection churn, p95/p99 latency, failover, automated offboarding and multi-region isolation against an independently reviewed alternative such as an immutable server-set transaction context with dedicated enforcement. No alternative may reduce cross-tenant denial guarantees.

### 6. Implementation and explicit stop lines
Implement source-only contracts, negative tests and disposable PostgreSQL proofs under items 213–261, with real financial execution disabled. No live role creation, customer SELECT grants, migration change to allow reads, endpoint mounting, staging deployment, cloud provisioning, IAM update, real secret creation, real-money settlement or customer data ingestion is authorised by this design.

**Implementation 212 closure criterion:** architecture decision committed, risk and rejected designs recorded, reviewer and Founder gates explicit. This document alone does not attest a live DB connection or complete the remaining Batch 10 implementations.
