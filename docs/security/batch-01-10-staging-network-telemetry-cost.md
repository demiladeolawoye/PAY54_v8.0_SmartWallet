# PAY54 Batch 01 — 10: Network Telemetry and Cost Exposure

**Environment:** `pay54-staging-uk-01` / `europe-west2`. **Spend approval:** NOT_GRANTED.

## Source inventory

Current Terraform defines a regional subnet with VPC Flow Logs `aggregation_interval=INTERVAL_10_MIN`, `flow_sampling=0.5`, `metadata=EXCLUDE_ALL_METADATA`; an EGRESS deny rule has firewall logging configured with excluded metadata; Cloud Run min instances 0, max instances 1. The source has no Cloud NAT resource or fixed NAT IP.

## Cost and evidentiary limitations

- A GBP 25 monthly budget alert is not a spend cap.
- Data processing, Cloud Run direct network traffic, audit/flow logs retention, network logging storage and traffic may incur costs if resources are created. Obtain fresh cloud-region pricing and a documented maximum expected exposure before provisioning.
- A sampled VPC Flow Log record does not prove every denied packet was observed; logging support depends on the actual network component, direction and policy.
- Firewall logging should be validated for the specific deny rule; logs may be sampled, incomplete or delayed.
- Source declarations cannot demonstrate the current logging retention, exclusion filters, sink destinations or security-monitoring efficacy.

## Acceptance and operational ownership

Budget owner, monthly cost estimate, spend alerts, planned retention, on-call escalation, sensitive-data redaction, telemetry access, log export decision and stop/rollback procedures require separate authorisation. No paid sink, NAT gateway or third-party observation service should be created under the existing batch approval.

**Status:** COST_AND_LOGGING_REVIEW_PENDING; NO_CLOUD_CHANGES.
