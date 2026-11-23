# PAY54 Batch 40 — Read-only Infrastructure Discovery and Operational Admission

**Protected baseline:** `project-titan` merge commit `ab4b044219cb0f181bd0f7f6478865253e8e51ad`, PR #79.

## Stage A — Repository inventory: completed without cloud access

The existing `infrastructure/staging/main.tf` declares the Google provider, regional `europe-west2` deployment, PAY54 private network/Cloud Run resources and `authorized_provisioning=false` by default. The intended Cloud project identifier `pay54-staging-uk-01` appears in the STG-04 offline audit. The reviewed Terraform file **does not declare a `google_sql_database_instance` managed PostgreSQL resource**.

These are statements about version-controlled configuration, **not** proof that a project, active billing account, Cloud SQL database, private network, runtime identity or deployment currently exists. A database may have been created outside Terraform; this repository inspection cannot discover that. Existing `backend/governance/staging-observations.json` records historic user-provided screenshots as unauthenticated observations, not current live verification.

The new Batch 40 source-only discovery module and workflow produce a fail-closed inventory using the existing STG-04 audit. They do not ask GitHub for any OIDC token, import GCP SDKs, issue SQL queries, run `terraform apply`, inspect secret values or activate an endpoint.

## Stage B — Actual read-only infrastructure inspection (requires separately authorised access)

**No operational connection has been made by this batch.** The accountable Cloud Platform Owner should first validate the correct organisation, billing account, project ID/project number, current services and named asset owners. Independent Security should then inspect effective IAM including organisation/folder inheritance, workload identity federation, service-account key inventory, private ingress/egress and audit logging. Inspect only Secret Manager metadata (name, version state, resource IAM, rotation policy and audit configuration); **never retrieve secret payloads**.

For managed PostgreSQL, the DBA must confirm vendor and service account, actual instance/cluster identifier, region, engine/major version, HA/backups, network/private connection, environment classification, maintenance window, database name, actual LOGIN-role privileges and existing financial-table RLS owners. If no instance exists, the decision is **NOT CONFIGURED**; the CTO must provide a costed deployment design for separate user approval rather than silently provisioning one.

The existing `backend/src/postgres-wallet-live-identity-probe.mjs` is capable of inspecting a *supplied authorised physical connection*, but CI uses a fake pool. A future approved staging operator must provide a restricted connection outside chat and capture a redacted, independently reviewed role/TLS evidence packet. The operator must not send credentials, certificates' private keys, bearer tokens, connection strings or customer records to the chat or GitHub logs.

## Stage C — Gated integration, no automatic activation

The following remain release blockers independent of green PR CI:

| Gate | Responsible office | Acceptance evidence |
| --- | --- | --- |
| Managed DB actual existence and owner | DevSecOps / DBA | Independently authenticated inventory, region and DB identity |
| Workload identity and TLS | Security | Effective IAM, verified SNI and CA chain, credential custody/rotation |
| Financial role graph | DBA / Fintech QA | All real writer roles, triggers, RLS compatibility and restored-backup regression |
| Wallet API | Backend Security | Real session-to-DB identity, fresh committed-state fence, account isolation, rate limits and audit |
| Available funds | Fintech Architecture / Compliance | Contracted provider settlement, safeguarding, reversals, holds, sign conventions and reconciliation |
| Mobile/desktop acceptance | Frontend / Mobile QA | Real authorised staging URL, responsive/device matrix, WCAG 2.2 AA and accessibility assistive-tech evidence |
| Operational cutover | Release Management | Named approver, immutable change, observability, emergency disable and rehearsed rollback |

**A source PR approval is not approval for actual staging deployment.** Separate named deployment authorisation must reference externally authenticated evidence and include a cost ceiling, stop conditions, independent security approval and rollback owner.

## Operator decisions requested (no secret values)

1. **PostgreSQL destination:** Is the plan Google Cloud SQL for PostgreSQL inside project `pay54-staging-uk-01`, or an alternative existing managed PostgreSQL provider? Confirm the *provider*, not any confidential connection details.
2. **Cloud/DB custodian:** Identify the account or team responsible for GCP project and database administration. This may initially be the founder acting as authorised project owner, but must be verified.
3. **Release authority:** Identify who may approve deployment, and who provides independent security/DBA review. The repository reviewer `milade2705` approves source changes only unless separately authorised.
4. **Cost control:** Confirm an affordable staging budget and authorise spending separately. A Cloud Billing budget alert is **not** an enforced cost cap.

## Release result

**Stage A:** Completed as an offline source audit after exact-commit CI and independent protected PR review.

**Stage B:** Waiting for authorised real inventory access; no cloud connection has occurred.

**Stage C:** Blocked pending independent evidence.

**PAY54 staging: NO-GO. PAY54 production: NO-GO. No live wallet balances, real-money operations or permanent financial database migrations.**
