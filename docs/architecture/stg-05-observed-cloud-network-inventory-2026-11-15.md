# PAY54 Enterprise — STG-05 Observed Network Inventory

**Phase:** 2G-AN  
**Control:** STG-05 — Private Networking and Egress Security  
**Observation date:** 2026-11-15  
**Google Cloud project:** `pay54-staging-uk-01`  
**Region under design:** `europe-west2`  
**Evidence source:** Operator-pasted read-only Google Cloud Shell output, not an independently authenticated connector session  
**Status:** USER_REPORTED_CLOUD_OBSERVATION — REVIEW REQUIRED  
**Provisioning authorisation:** NOT GRANTED  
**Staging release:** BLOCKED  
**Financial execution:** DISABLED

## 1. Observation procedure

The operator supplied output from:

```sh
gcloud compute networks list --project=pay54-staging-uk-01
gcloud compute networks subnets list --project=pay54-staging-uk-01
gcloud compute firewall-rules list --project=pay54-staging-uk-01
gcloud compute routes list --project=pay54-staging-uk-01
```

The first inventory attempt prompted for `compute.googleapis.com` activation; the operator entered `y`, and the API-enable operation subsequently completed successfully. This was a **user action changing project service configuration**, not a read-only action. Do not repeat or reverse without review. The Google Cloud billing and audit-log impact must be assessed by the project owner.

## 2. Network and subnet observations

The list returned a single named VPC:

| Field | Observed value |
| --- | --- |
| Name | `default` |
| Mode | `AUTO` |
| Routing mode | `REGIONAL` |
| London subnet name | `default` |
| London subnet region | `europe-west2` |
| London subnet IPv4 CIDR | `10.154.0.0/20` |

The operator supplied other automatically created `default` subnets across Google Cloud regions; the relevant observed ranges include `10.128.0.0/20` in `us-central1`, `10.132.0.0/20` in `europe-west1`, and `10.154.0.0/20` in `europe-west2`. Their presence supports the conclusion that the default network uses automatic subnet creation.

**No custom PAY54 VPC was shown.** This is evidence of the returned project inventory only, not exhaustive proof about Shared VPC, peered networks, reservations, routes in other projects, VPNs, organisation-level controls, or managed service allocations.

## 3. Firewall and routing observations

`gcloud compute firewall-rules list` returned these four rules, all associated with `default`:

| Name | Direction | Priority | Declared allowed traffic |
| --- | --- | --- | --- |
| `default-allow-icmp` | INGRESS | 65534 | ICMP |
| `default-allow-internal` | INGRESS | 65534 | TCP 0–65535, UDP 0–65535, ICMP |
| `default-allow-rdp` | INGRESS | 65534 | TCP 3389 |
| `default-allow-ssh` | INGRESS | 65534 | TCP 22 |

The inventory command did not show rule source ranges, targets, enablement context beyond the listed fields, effective hierarchical/global/regional firewall policies, or whether any VM interfaces exist. The allow rules may permit exposure **if matching workloads and routing exist**; the listing does not establish that a PAY54 service is exposed.

The default VPC route inventory includes:

- An Internet default route `0.0.0.0/0` to `default-internet-gateway`, priority `1000`.
- Regional subnet routes, including `10.154.0.0/20` (London), priority `0`.

Those routes are on `default`. **They are not evidence that the separate proposed PAY54 VPC has an internet route or that any workload uses the default VPC.**

## 4. Engineering reconciliation

Existing `infrastructure/staging/main.tf` source defines a dedicated `pay54-staging-private` custom-mode network, `pay54-staging-egress-london` subnet, targeted deny-all IPv4 outbound firewall rule, and Cloud Run Direct VPC `ALL_TRAFFIC` attachment. These are **unprovisioned source declarations** guarded by `authorized_provisioning=false`.

Decision: Preserve the default VPC and its settings as-is for this checkpoint. Do not attach the PAY54 staging workload to the default VPC. Do not claim that the new dedicated VPC, subnet or firewall exists yet.

The approved staging CIDR input **remains null/unset**. No CIDR value may be marked approved from the present evidence alone. Before approval, check address reservations and overlaps across the project, Shared VPC, peered/VPN/Interconnect environments, planned private service ranges and any organisation-level IPAM.

Do not infer an enforced external provider destination allowlist from a VPC deny rule. Do not assert that firewall policy blocks Google-managed service endpoints, metadata, DNS or all platform dependencies without targeted verification.

## 5. Evidence and implementation gates

| Gate | Status | Further evidence required |
| --- | --- | --- |
| Existing project VPC listed | USER_REPORTED | Authenticated independently captured inventory and timestamp |
| Existing firewall/route declarations listed | USER_REPORTED | Full rules, hierarchical policies, source ranges, effective network access |
| Compute API activated | OPERATOR_REPORTED_ENABLED | Service state and Cloud Audit Logs, budget and owner acknowledgement |
| Approved custom VPC subnet CIDR | OPEN | IPAM overlap review and sign-off |
| STG-05 network implementation | SOURCE_ONLY | Reviewed Terraform schema and offline regression result |
| Effective ingress/egress enforcement | NOT_VERIFIED | Controlled deployment and independently witnessed negative tests |
| Provisioning/release authorisation | BLOCKED | STG-01..STG-07 approvals and separate signed change approval |

The historical GBP 25 monthly budget is a **notification threshold**, not a spending cap.

## 6. Non-mutating follow-up evidence commands

When separately authorised for further read-only inspection, the owner/reviewer may run:

```sh
gcloud compute firewall-rules list --project=pay54-staging-uk-01 --format=json
gcloud compute networks list --project=pay54-staging-uk-01 --format=json
gcloud compute networks subnets list --project=pay54-staging-uk-01 --format=json
gcloud compute routes list --project=pay54-staging-uk-01 --format=json
gcloud services list --project=pay54-staging-uk-01 --enabled --filter='config.name:compute.googleapis.com'
```

These commands are intended as inventory operations. If Cloud Shell asks to enable a service, change permissions, or create resources, **decline and return the error for review**. Screenshots or reports must not expose access tokens, service-account keys or other credentials.

## 7. Required independent approvals

The present submission is adequate to update the PAY54 engineering risk register but is **not** a signed security approval. Keep `authorized_provisioning=false`, providers disabled, the staging release blocked, and financial execution disabled.

References: `docs/architecture/staging-network-security-contract.md`, `docs/architecture/ADR-005-staging-network-egress.md`, and `docs/architecture/stg-05-terraform-implementation-plan.md`.
