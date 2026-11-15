# PAY54 Batch 01 — 06: Egress Threat and Destination Consistency

**Scope:** Source-derived STG-05 review. **Security approval:** NOT_VERIFIED.

## Canonical inputs

- `backend/governance/staging-egress-threat-model.json` maintains EG-01 through EG-06 with status OPEN.
- `backend/governance/staging-egress-destinations.json` has empty proposed and approved destinations, `inventoryStatus=NOT_ESTABLISHED`, `enforcementStatus=NOT_IMPLEMENTED`, `defaultOutboundDecision=DENY_PENDING_IMPLEMENTATION`.
- `infrastructure/staging/main.tf` defines a gated dedicated VPC, subnet, outbound IPv4 firewall and Cloud Run Direct VPC egress.
- `backend/governance/staging-egress-threat-model.mjs` permits only an independently source-policy-validated topology while retaining outbound enforcement NOT_VERIFIED.

## Reconciliation

The Terraform design can be SOURCE_IMPLEMENTED while the provider inventory remains NOT_ESTABLISHED and effective runtime controls remain NOT_VERIFIED. This is deliberate and not a contradiction. The design allows no approved public provider destinations; no NAT or public provider enablement is intended. The threat register's EG-01 through EG-06 remain OPEN until independently witnessed live negative access tests, account-level IAM review and approved destination assessment.

## Regression controls

Existing workflows `pay54-staging-egress-threat-model.yml`, `pay54-staging-egress-destinations.yml`, and `pay54-staging-network-policy.yml` perform bounded offline checks. No source validator may set a threat to CLOSED, claim cloud attestation, authorise provider access, or change `approvedDestinations` without separate governance evidence. This review changes neither the canonical JSON inventories nor workload behaviour.

**Outcome:** DESIGN_CONSISTENT_SOURCE_ONLY; all threat gates remain OPEN.
