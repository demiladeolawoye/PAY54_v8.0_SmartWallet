# PAY54 Batch 41 — Cloud SQL Staging Cost Admission (Source Only)

Date: 24 November 2026. Parent: protected `project-titan` commit `917404fdb83b4f208cd709c0c7fede832f4f0205`.

## Decision held
Preferred candidate: Cloud SQL for PostgreSQL 16, Enterprise edition, London `europe-west2`, zonal; initially **unprovisioned**. The administrator has confirmed the £25 monthly billing budget and actual-spend alert thresholds. This budget is **alerts only**, not an enforced cost cap and not authorisation to spend.

The user supplied screenshots of Google Cloud Billing and Cloud SQL onboarding, not an authenticated active SQL inventory. Actual Cloud SQL instance existence remains independently unverified.

## Sources and modelling boundary
Compute indicative London USD rates from public catalogue observed 24 November 2026: https://instances.usage.ai/gcp/sql/region/europe-west2 : `db-f1-micro` $0.0126/hour, `db-g1-small` $0.042/hour. Illustrative 2 vCPU/8 GiB dedicated compute $0.1664/hour (must be re-priced in billing calculator).

Storage and backup *planning* assumptions from Google's published Cloud SQL pricing: SSD $0.000232877/GiB-hour; backup used $0.000109589/GiB-hour. Region/edition and actual invoice SKU may differ. https://cloud.google.com/sql/pricing . These figures are not a GBP billing quote and are intentionally not converted using an unverified exchange rate. Backup storage use is estimated, not necessarily equal to allocated disk.

The repository function `backend/governance/pay54-cloudsql-cost-assumptions.mjs` computes separately: active compute hours, full-month allocated storage, full-month retained backup usage and a user-supplied network/operations allowance. It does not apply discounts, trial credits, taxes or invented zero-cost network costs.

### Reference scenarios (USD, 730-hour month, 10 GiB SSD, 10 GiB backup used, network/ops excluded)

| Tier | Compute 80h | Compute 730h | SSD 730h | Backup used 730h | Illustrative subtotal at 80h | At 730h |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| db-f1-micro | $1.01 | $9.20 | $1.70 | $0.80 | $3.51 | $11.70 |
| db-g1-small | $3.36 | $30.66 | $1.70 | $0.80 | $5.86 | $33.16 |
| dedicated 2 vCPU / 8 GiB | $13.31 | $121.47 | $1.70 | $0.80 | $15.81 | $123.97 |

IMPORTANT: above is **not** a deployable database specification or cost ceiling. Underlying compute assumptions require an actual GBP Cloud Billing pricing calculator quote. Additional services (private networking, egress, Cloud Run, observability, reserved IP, snapshots and taxes) could materially change the total. Storage and IP charges can continue after Cloud SQL is stopped: https://docs.cloud.google.com/sql/docs/postgres/start-stop-restart-instance .

### Technical trade-offs

- Shared-core machines are NOT covered by the Cloud SQL SLA. They may support isolated disposable developer integration only, never PAY54's regulated production environment and not a substitute for full staging performance testing.
- Dedicated compute is architecturally preferable for trustworthy representative staging, but 24/7 dedicated compute exceeds the £25 target before extras.
- Continue PostgreSQL 16 automated CI/RLS/ledger tests in disposable environments while the cloud cost plan remains unsigned.
- If a managed staging instance is later approved, use a **finite, supervised test window** with an explicit lifecycle/backup/retention/cleanup plan, not indefinite operation. Stopping the instance does not guarantee zero charges.
- Cloud SQL free-trial eligibility or special promotional free-instance conditions must not be assumed; region, database engine and configuration must match the actual trial terms.

## Operational pricing-quote checklist
Before ANY cost-bearing action, the owner must obtain a Google Cloud Billing Calculator quote in **GBP** for London using:
- Cloud SQL for PostgreSQL 16, edition Enterprise, exact machine type and 10 GiB (or Google-enforced minimum) SSD
- Single zone, actual supported network mode, active hours (80 and 730 comparisons)
- Actual billed backup/PITR retention and space, public/private networking, egress
- Cloud Run, Secret Manager, monitoring, logs, budgets and potential IP/VPC extras
- VAT/taxes and any actual free trial/credits (with eligibility and expiry documented)
- A finite maximum approved exposure, start and teardown dates, named operator and cleanup verification

The £25 threshold may be exceeded even where alerts are configured; alert budgets are not a spending stop control. No automated cloud action is permitted by this PR.

## Approval stages

| Gate | Status |
| --- | --- |
| Source pricing comparison | **PRELIMINARY MODEL** |
| Current GBP billing calculator quote | **MISSING** |
| Cloud SQL instance present in target project | **NOT LIVE-VERIFIED** |
| IAM administrator/provider identity | **NOT INDEPENDENTLY VERIFIED** |
| DBA and Security approval of persistent financial RLS | **MISSING** |
| Signed staging spending approval | **NOT GRANTED** |
| Customer-available funds/regulated provider settlement | **NOT VERIFIED** |
| Staging deployment | **NO-GO** |
| Production/realtime payment operations | **NO-GO** |

No Terraform apply, API activation, database migration, live connection, credential retrieval, customer balance presentation or real-money operations.
