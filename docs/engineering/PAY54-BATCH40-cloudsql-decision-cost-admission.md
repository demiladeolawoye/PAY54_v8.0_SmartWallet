# PAY54 Batch 40 — Approved Cloud SQL direction and cost admission

## Decision recorded — 2026-11-23

- Preferred **staging** database product: **Google Cloud SQL for PostgreSQL**.
- Intended project source identifier: `pay54-staging-uk-01`.
- Preferred region: `europe-west2` (London), subject to current cloud/DB confirmation.
- The founder currently administers the cloud project. This is a user declaration, **not** authenticated Cloud IAM, owner or billing-role evidence.
- **Explicitly NOT approved:** creating an instance, upgrading APIs, issuing an IAM credential, reading secrets, deploying application services, running persistent SQL migrations, authorising spending or exposing customer wallet balances.
- Stage B: read-only discovery with separately authorised access and independent evidence. Stage C: controlled staging activation only after a new signed release decision.

## Costed architecture recommendation for separate approval

**Candidate for disposable and early integration testing:** PostgreSQL Cloud SQL **Enterprise edition**, single zone, smallest supported shared-core or other smallest configuration capable of safely executing the approved ledger/RLS workload. Ensure a supported PostgreSQL major version matching the disposable CI target (currently PostgreSQL 16) **and select the edition explicitly**. Google notes that Enterprise Plus may be the default for newer-version instance creation. Do not infer that a low-tier shared-core configuration is an enterprise-fintech production topology or has the required service-level guarantee.

**Important caveat:** the current ledger/RLS workloads may exceed shared-core or resource limits; the minimum acceptable tier must be measured by performance, memory and concurrency rather than chosen solely by price. For regulated production, review dedicated compute, HA, backup/PITR, recovery and data protection independently.

London edition/machine coverage can be checked at:
https://docs.cloud.google.com/sql/docs/postgres/region-availability-overview

The official live price source is:
https://cloud.google.com/sql/pricing

The official calculator is:
https://cloud.google.com/products/calculator

Calculate the full cost in the billing currency immediately before release approval, including compute-hours (24/7 **and** controlled short-lived test window), allocated SSD storage, backup/PITR, network ingress/egress, Cloud Run and VPC/connector expenses, monitoring/logging, taxes and any paid support. Do not turn the historic GBP 25 monthly notification budget into a claimed hard spending cap. Neither Cloud SQL pricing, availability, account discounts nor present billing limits are attested by repository source.

## Read-only verification operator checklist

1. Verify the intended project in Google Cloud console, identify project **number**, owning organisation, linked billing account, IAM privileges and the named administrator. Do not copy service-account keys, personal identifiers or sensitive details to GitHub.
2. Navigate to Cloud SQL **Instances** and record (in a restricted evidence store) whether an instance already exists. If present, record *non-secret metadata only*: instance resource name, database engine/major version, region, edition, machine tier, HA and backup/PITR settings, primary network/IP configuration and operational owner. Do not connect to a live financial database during preliminary discovery.
3. Check effective IAM role inheritance, Cloud SQL Admin API status, authorized service identities, VPC/private service access, workload identity federation, audit-log settings and Secret Manager *metadata*. Do not request or retrieve secret payloads.
4. Have the DBA review the Batch 38 forward/rollback SQL against an isolated schema snapshot before any persistent apply. Independently test actual ledger-writer roles and financial forced-RLS effects; neither source CI nor this decision approves the migration.
5. Obtain a fresh official pricing-calculator estimate, naming usage hours, storage, HA choice, backup, egress, logging and other relevant components. Separate budget approval must name a maximum permitted expenditure and a rollback/stop owner.
6. Only after a signed change and staging-admission evidence may DevSecOps plan a provisioning execution. Source PR reviewer `milade2705` is not presumed to be a cloud release approver.

## Gate status

| Evidence | Status |
| --- | --- |
| User's product preference | DECIDED, NOT PROVISIONED |
| Region and project source reference | DECLARED, NOT CLOUD-ATTESTED |
| User's administration claim | DECLARED, NOT IAM-ATTESTED |
| Actual database instance inventory | NOT VERIFIED |
| Official price for approved configuration | NOT ESTIMATED |
| Actual credential custody / TLS | NOT VERIFIED |
| Independent DBA migration and writer-role RLS review | NOT VERIFIED |
| External payment settlement and spendable balance | NOT VERIFIED |
| Real mobile-first authenticated staging tests | NOT VERIFIED |
| Staging deployment approval | BLOCKED |
| Production deployment and real money | BLOCKED |

**Decision: NO Terraform apply, API enablement, Cloud SQL creation, live login, migration, wallet exposure or spending without a separate explicit approval.**
