# PAY54 Batch 01 — 08: Cloud Network Observation and IPAM Gap Review

**Evidence date:** 2026-11-15. **Classification:** User-supplied Cloud Shell text, not independently authenticated cloud attestation.

## Observed

Project `pay54-staging-uk-01` returned a single `default` auto-mode VPC with `europe-west2` subnet `10.154.0.0/20`. Its default VPC carries a 0.0.0.0/0 internet-gateway route, regional subnet routes, and four classic ingress-allow firewall rules: ICMP, internal, RDP 3389 and SSH 22. The Compute Engine API was enabled by the operator in response to a command prompt.

## Not established

- Whether Shared VPC, VPN/Interconnect, peering, privately allocated service ranges or another project's IPAM overlap proposed addressing.
- Whether hierarchical, global/regional network firewall policies override local decisions.
- Whether any VM, NIC, static address, serverless revision or existing workload receives the observed allow rules.
- Effective project/org IAM, organisation policies, DNS resolver policy, Cloud NAT, Google-managed platform egress and billing.
- Whether audit logs independently confirm the user-supplied output.

## Engineering disposition

Do not reuse the default VPC. Do not allocate an arbitrary subnet or populate `staging_subnet_cidr`; this input remains null until reviewed. A distinct network's ranges need not overlap the default network for simple isolated use, but all future connectivity and enterprise address management must be checked. No inference of exposure or isolation is justified solely from the visible route and firewall listings.

**Next evidence:** signed IPAM decision; effective firewall policies and network attachment inventory; budget review; independent reviewer identity.
