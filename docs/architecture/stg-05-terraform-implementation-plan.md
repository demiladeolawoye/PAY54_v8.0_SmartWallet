# PAY54 Project Titan — STG-05 Terraform Implementation and Regression Plan

**Version:** 1.0.0  
**Phase:** 2G-AN  
**Control:** STG-05 — Private Networking and Egress Security  
**Document class:** Repository-verified, offline implementation plan  
**Prepared:** 15 November 2026  
**Decision status:** DESIGN_SPECIFIED — NOT IMPLEMENTED OR APPROVED  
**Staging release:** BLOCKED  
**Cloud provisioning:** DISABLED  
**External destinations:** None approved  
**Financial execution:** DISABLED

## 1. Purpose and authoritative source

This plan reconciles actual `project-titan` repository files with the committed STG-05 contract. It does not duplicate, supersede, or weaken:

- `docs/architecture/staging-network-security-contract.md` (v1.0.0; STG-05);
- `docs/architecture/ADR-005-staging-network-egress.md` (v1.0.0; accepted target, blocked implementation);
- `infrastructure/staging/main.tf` (v1.0.0);
- `backend/governance/staging-network-policy.mjs`;
- `backend/governance/staging-egress-destinations.json` and its validator.

All observations in this document are *source-level*. No authenticated Google Cloud inventory, provider approval, runtime denial test, Terraform apply or independent security attestation has been performed.

## 2. Verified repository baseline

Read from `demiladeolawoye/PAY54_v8.0_SmartWallet`, branch `project-titan`, on 15 November 2026:

| Source | Blob SHA |
| --- | --- |
| `infrastructure/staging/main.tf` | `f86e21c2d2300fea0b4e6111163ab5f27492b53d` |
| `docs/architecture/staging-network-security-contract.md` | `ecf90cc8389effe440d39de6cf523bc8100207ba` |
| `docs/architecture/ADR-005-staging-network-egress.md` | `b2b186b5a7ce771eaa76688099a62499a8957216` |

The current `main.tf` declares Terraform >= 1.14 and Google provider ~> 7.0; `authorized_provisioning` defaults to false and is the `local.enabled` gate. Existing Google resources are guarded with conditional `count` or `for_each`. The Google Cloud region is `europe-west2`, with the single-instance `pay54-news-staging` Cloud Run service, internal-only ingress, `invoker_iam_disabled = false`, deletion protection and a dedicated runtime service account. The GitHub Workload Identity Federation provider is declared disabled. The image input requires a SHA-256 digest.

The existing Terraform **does not declare** a staging VPC, regional subnet, outbound-deny firewall, Direct VPC attachment, or `ALL_TRAFFIC` egress. Thus effective outbound enforcement is **NOT_VERIFIED**, and STG-05 must remain blocked.

The existing source policy contains a **fixed inventory of 12 expected resources**. Its `RESOURCE_INVENTORY` and `GATED_RESOURCES` tests reject additional resource blocks; the existing source-only `CONTROLLED_EGRESS` finding deliberately stays `NOT_VERIFIED`. Other current regression tests assert specific baseline resource and security properties. Any implementation that simply appends networking resources to `main.tf` without first updating these contracts will cause expected CI failures.

The repository also contains read-only workflows for the staging source audit, network policy, egress destination inventory and infrastructure regression suite. This work package must extend these, not introduce a competing source of truth.

## 3. Target security topology — offline design only

```text
Cloud Run: pay54-news-staging
  Internal-only ingress + authenticated invocation
  Dedicated PAY54 staging runtime identity
                 |
                 v
Cloud Run Direct VPC egress: ALL_TRAFFIC
  Explicit network/subnet attachment and workload egress tag
                 |
                 v
Dedicated custom-mode VPC; dedicated europe-west2 subnet
  Automatic subnet creation disabled; subnet CIDR not yet approved
                 |
                 v
Targeted outbound firewall deny (review effective policy priority)
                 |
                 +----> Public Internet: DENIED
                 +----> Public provider endpoints: DENIED
                 +----> Narrow platform dependencies: REVIEW REQUIRED
```

No Cloud NAT, proxy, internet egress exception, Marketaux credentials or provider allowlisting is authorised. A regional subnet CIDR must not be chosen until authenticated inventory establishes non-overlap. Assess necessary Google-managed platform traffic, DNS, metadata and Private Google Access separately: an ordinary VPC firewall declaration is not sufficient to claim complete isolation of platform-managed paths.

The architectural goal is a **fail-closed, staging-only foundation**. Because all-traffic denial may stop the workload functioning, source implementation does not mean the service is deployable. Any later public provider access requires a separately approved destination register, bounded gateway or proxy, HTTPS/TLS and DNS protections, direct-IP and DNS-bypass negative tests, and a documented cost decision. Cloud NAT alone is not hostname allowlisting.

## 4. Implementation order and dependencies

### 4.1 Prerequisite evidence (no source activation)

1. Obtain authenticated read-only inventory of relevant VPC networks, subnets, effective routes, DNS configuration, org policies and existing firewall policies, when separately authorised.
2. Confirm a non-overlapping staging subnet CIDR and actual platform service dependencies.
3. Assign independent reviewer and approve network trust boundary and a bounded cost estimate.
4. Review current Google provider 7.x schema for `google_cloud_run_v2_service.template.vpc_access`, subnet flow logging and firewall resource fields using pinned local tooling. Do not invent provider arguments.
5. Resolve the explicit restriction on enabling the Compute Engine API. VPC/subnet/firewall provisioning requires appropriate networking APIs and permissions; this plan does not authorise enabling them.

### 4.2 First implementation patch — governance and test contracts

Before changing Terraform, update *the existing* `backend/governance/staging-network-policy.mjs` and `backend/tests/staging-network-policy.test.mjs` to recognise the exact new VPC/subnet/firewall resources and their conditional gate. Do not turn the expected-resource inventory into a permissive wildcard: maintain an explicit allowlist, reject unknown and duplicate resources, and reject any unguarded resource. Preserve all original checks and static-versus-runtime distinction. Expand fixture tests with secure and deliberately insecure network configurations.

Review `backend/tests/staging-infrastructure.test.mjs` and the read-only staging CI workflows for assumptions about the number of Terraform resources, service attachment and safe static validation. Extend existing tests rather than duplicating them in a new suite.

**Important:** Publish governance and implementation changes as a single reviewable change set where possible, so the branch never appears secure through weakened tests.

### 4.3 Second implementation patch — Terraform source

Once inventory, policy contracts and provider schema are reconciled:

1. Define a dedicated custom-mode staging VPC with automatic subnet creation disabled, resource count gated by `local.enabled`.
2. Define a dedicated regional subnet with reviewed CIDR and flow-log configuration, also gated.
3. Define targeted outbound-deny firewall restrictions for the workload egress tag; check priority against all effective hierarchical, global, regional and implied rules. Do not claim precedence from a local priority alone.
4. Add Cloud Run Direct VPC access to its existing template using approved network/subnet references and `ALL_TRAFFIC`, preserving service name, account, scaling, image digest, IAM settings and deletion protection.
5. Keep approved public destinations empty; introduce no NAT, egress proxy, service key, extra project-wide IAM role or open firewall allow rule.
6. Keep `authorized_provisioning=false` in source defaults, CI and examples. All new resources must remain conditional on that existing gate.
7. Avoid adding or enabling `compute.googleapis.com` without separate formal provisioning authorisation. Static source additions are not permission to activate APIs.

Do not refactor existing Terraform state addresses or provider constraints as incidental cleanup. If resource renaming becomes necessary, document explicit state moves and rollback before review.

## 5. Deterministic offline regression acceptance contract

The existing source-policy and infrastructure test suites must cover at minimum:

| ID | Source assertion | Failure injection |
| --- | --- | --- |
| NET-S01 | `authorized_provisioning` defaults false and drives all resources | Default true / unguarded new resource |
| NET-S02 | Known-resource allowlist includes exactly the reviewed resources | Unknown or duplicate resource |
| NET-S03 | Dedicated VPC with custom subnet mode | Default VPC / auto subnets |
| NET-S04 | Subnet in `europe-west2`, using approved network reference | Wrong region / missing reference |
| NET-S05 | Cloud Run network references approved subnet and VPC | No attachment / different network |
| NET-S06 | Cloud Run `ALL_TRAFFIC` egress explicitly declared | PRIVATE_RANGES_ONLY / absent |
| NET-S07 | Egress tag has reviewed restrictive policy | Missing deny / mis-targeted tag |
| NET-S08 | No broad unreviewed outbound allow or NAT | Any explicit broad egress exception |
| NET-S09 | Ingress internal and IAM invoker checks active | Public ingress / authentication disabled |
| NET-S10 | Runtime service account and bounded scaling preserved | Default SA / scale unbounded |
| NET-S11 | Federation disabled, immutable GitHub identity restrictions retained | Federation enabled / weakened claims |
| NET-S12 | Pinned digest and deletion protection preserved | Tag-only image / protection disabled |
| NET-S13 | Empty approved external destination list retained | Added self-approved provider |
| NET-S14 | No plaintext credentials or unrestricted IAM binding | Hard-coded token / allUsers |
| NET-S15 | CI has no apply/destroy, cloud credential or automatic deployment path | Introduced deploy command or credential scope |
| NET-S16 | No unauthorised API enablement or financial execution | Compute API added or payment activation |

Tests must use bounded local fixtures and source-aware analysis (not loose affirmative regexes) and must deliberately fail on adversarial mutations. Existing tests remain mandatory. Terraform formatting and schema validation are allowed offline with already available binaries/provider plugins; `terraform init` may download provider packages and is not itself a cloud deployment, but should use controlled dependency sourcing. **Do not use `terraform plan` as proof of being offline**, since provider data sources and refresh can access Google Cloud.

Static checks cannot establish effective firewall precedence, metadata behaviour, private platform routes, runtime IAM, HTTPS provider access, cost, logging completeness or authorisation. Those items remain independent release gates even when all source tests pass.

## 6. Future authorised runtime tests (not performed)

Capture immutable revision, configuration snapshots and reviewer identity. Test both authenticated internal invocation and anonymous denial. Verify actual VPC attachment, subnet region, effective firewall policy, routes, runtime identity and enabled APIs. Exercise denied public destination, direct IP, nonstandard port, alternate DNS, DNS-over-HTTPS, redirect, TLS failure and proxy bypass where applicable. Verify supported flow/audit logs without claiming that Cloud Run revision identities automatically appear in VPC Flow Logs. Check cloud budget and metered spend; the historical £25 budget is an alert threshold, not a hard cost ceiling.

Formal sign-off requires STG-01 through STG-07 evidence, signed container provenance, network negative tests, operational ownership, and explicit separate provisioning and release authorisations.

## 7. Safe review, commit and rollback

**No Terraform changes belong to this document-only checkpoint.** Proposed later source-change order: policy/test contracts -> gated Terraform network declarations -> offline test evidence -> independent security review -> separately authorised cloud provisioning -> authenticated runtime tests -> release decision.

A future implementation pull request should include changed-file inventory, full test transcript, provider/schema evidence, Terraform diff, known limitations, cost estimate, independent security observations, and a rollback plan. Revert source-only commits if offline regressions fail; do not run `terraform destroy` as an automatic rollback.

**Suggested implementation PR title:** `feat(security): implement gated STG-05 private network and offline regression controls`

## 8. Current milestone status

- STG-05 contract: committed to `project-titan`; source inspected.
- ADR-005: committed to `project-titan`; source inspected.
- Existing staging Terraform: inspected; unchanged.
- Network design and regression sequence: documented here.
- STG-05 Terraform implementation: **NOT IMPLEMENTED**.
- Static network integration tests: **NOT RUN FOR NEW DESIGN**.
- Authenticated cloud inventory: **NOT VERIFIED**.
- Independent security review: **NOT VERIFIED**.
- Staging release: **BLOCKED**.
- Provisioning, external providers and financial execution: **DISABLED**.

**Next responsible engineering action:** prepare the smallest complete combined patch to the existing STG-05 source-policy validator, its tests, the staging infrastructure tests and the Terraform file, subject to the prerequisite CIDR, API and effective networking design decisions. Do not simulate or assume those prerequisites have been satisfied.
