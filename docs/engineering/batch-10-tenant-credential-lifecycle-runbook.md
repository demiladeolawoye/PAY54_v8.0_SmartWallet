# PAY54 Batch 10 — Implementation 253 Credential and Tenant Role Lifecycle Runbook

**Classification:** Engineering operating procedure draft. Not approved for live credential issuance.

## Custody and identity separation
- Identity source: a verified server session resolves an immutable PAY54 principal, current account membership and tenant/account mapping from authoritative services.
- Role source: database provisioning control plane maintains a one-to-one tenant-role registry with a documented owner; application read workloads cannot provision, grant privileges, assume other tenants or impersonate database administrators.
- Credentials: issued through a workload-identity-scoped secrets service and injected only into an approved connector. Secret values must never enter JavaScript browser bundles, localStorage, CI logs, telemetry, GitHub source or customer support exports.
- DB session: authenticated `session_user` and effective `current_user` must both equal the verified role; independently inspect privileges, RLS, ownership, trusted TLS peer and source credential.
- Workload and deployment: separate provisioning, runtime read, migration and incident roles; deny production write privileges to account read workloads.

## Lifecycle sequence

| Phase | Required operation | Evidence / rollback |
|---|---|---|
| Request | Authorised account lifecycle request with maker/checker where appropriate | Durable request and entitlement proof |
| Provision | Restricted provisioning service creates least-privilege tenant identity in sandbox first | Privilege matrix, role state and account binding |
| Activate | Validate independently issued TLS credential, role, tenant mapping and fresh epoch | Positive own-account and negative other-account tests |
| Rotate | Raise the credential epoch, mint new scoped secret, invalidate old checkouts and deny old credential use | Revoked old sessions, no overlap across tenants |
| Revoke | Revoke session/member rights and credential, discard all pinned sessions | Negative attempts after revocation and recovery drills |
| Offboard | Remove role and secret via approved retention/change process | Audit trail, zero residual role grants and connection handles |
| Recover | Use separately protected break-glass credentials only with explicit authorisation | Time-limited emergency access log and independent review |

## Failure policies
A tenant identity mapping outage, audit sink failure, expired credential, mismatched role, disabled TLS peer verification, cache inconsistency, connection reuse, unreconciled epoch or lack of independent attestation causes **DENY**. Do not switch to a global privileged pool, use `SET ROLE`, relax customer RLS or bypass fresh membership verification.

## Unimplemented infrastructure
Live per-tenant credentials, endpoint trust store, zero-downtime rotation, IAM/workload identity, distributed revocation store, credential vault, cloud networking, production PostgreSQL grants and deployer/service-account controls are **NOT configured** by this file.

**Activation gate:** independent DevSecOps/security approval, performance cost model, disaster-recovery rehearsal and explicit Founder approval.
