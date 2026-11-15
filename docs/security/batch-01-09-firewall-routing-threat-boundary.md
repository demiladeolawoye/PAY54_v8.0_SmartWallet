# PAY54 Batch 01 — 09: Firewall and Routing Trust Boundary

**Design scope:** Unprovisioned source declarations for `pay54-news-staging` in `europe-west2`.

## Intended path

Cloud Run internal-only authenticated ingress -> dedicated runtime identity -> Direct VPC egress `ALL_TRAFFIC` -> `pay54-staging-private` custom VPC -> approved `pay54-staging-egress-london` subnet -> tagged EGRESS deny with IPv4 destination range `0.0.0.0/0` and protocol `all`.

## Threat assumptions and mitigations

- **Default VPC bypass:** Explicitly bind Cloud Run to the dedicated network/subnet, never `default`. Verify attached revision and effective routes independently.
- **Firewall precedence:** A local deny at priority 1000 cannot guarantee global enforcement when hierarchical and network firewall policies are unknown. Obtain effective-policy evidence; source regex is insufficient.
- **DNS, metadata, Google-managed endpoints:** These may use platform-managed access paths and require application-layer SSRF, endpoint and identity controls. Do not infer complete blockage from one VPC rule.
- **IPv6:** An IPv4 `0.0.0.0/0` deny is not proof that IPv6 traffic is denied; verify supported stack and routes.
- **Public provider access:** None approved; no Cloud NAT, internet proxy or broad firewall exception may be introduced in this phase.
- **Service availability:** Unconditional egress denial may break runtime functionality; this is acceptable as a deliberate no-activation staging baseline but not approval to operate a useful news service.

## Required negative tests after authorised provisioning

Attempt unauthorised public IP, approved-port-but-unapproved-host, alternate DNS, redirected TLS hostname, metadata/SSRF and revisional bypass traffic; evidence must demonstrate denial independently. Record test identity, timestamp, revision, IAM, effective network rules and logs. Avoid capturing credentials/customer information.

**Status:** SOURCE_ONLY; NO_EFFECTIVE_RUNTIME_EVIDENCE.
