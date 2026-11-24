# PAY54 Batch 42 — GBP Cloud SQL quote evidence intake (source only)

Date: 24 November 2026. Target: protected `project-titan`. This package is independent of draft PR #81.

## Purpose
Record whether an **owner-supplied** Google Cloud Billing Pricing Calculator quote has the minimum structured fields needed for a human Finance/Security review. The validator is not connected to Google, cannot retrieve billing data, and never declares quoted evidence genuine. Do not substitute illustrative USD assumptions or a currency conversion for the account-specific GBP quote.

## Intake contract
The pure ES module `backend/governance/pay54-gbp-quote-evidence.mjs` checks: quote reference and issue date; GBP; `europe-west2`; PostgreSQL 16/Enterprise; machine type; zonal availability; compute hours; SSD and backup quantities/retention; compute, storage, backup, network, operations and tax GBP line items; matching GBP total; HTTPS evidence location; operator, reviewer and teardown date.

An input passing schema and arithmetic checks is **INDEPENDENT_REVIEW_REQUIRED**, not **APPROVED**. The URL is a user-provided reference and is NOT automatically inspected or authenticated. Prices are never populated by this package; evidence must come from the account owner and be independently checked against current Google Cloud terms. If a quoted service cannot be priced, record the genuine uncertainty in the Finance review; do not invent a zero-cost assumption.

## Mandatory admission controls
1. Named Finance reviewer validates the quote in the actual billing account, the correct SKU/region, taxes, network and operational charges, retention charges, currency, validity and teardown exposure.
2. Security/DBA verifies IAM, data isolation, TLS, RLS, migration rollback and monitoring before staging.
3. Owner gives a separate, explicit maximum-exposure spending approval and a finite start/stop/cleanup window. A £25 *alert* is not a cost ceiling.
4. Live infrastructure inventories, approvals and CI/test results must be independently verified. Unreviewed evidence cannot trigger cloud actions.
5. No production payment activity, customer balance assertion, deployment or regulated-money action is authorised.

The included source-only tests execute with `node --test backend/tests/pay54-gbp-quote-evidence.test.mjs`. There is no cloud SDK, credential handling, billing API, payment API, Terraform apply or provisioning step in this change.

**Staging NO-GO. Production NO-GO. Spending NOT APPROVED.**
