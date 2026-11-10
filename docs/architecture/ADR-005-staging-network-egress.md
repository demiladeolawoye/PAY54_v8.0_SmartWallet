
# PAY54 ADR-005 — Staging Network Egress Architecture

**Programme:** PAY54 Enterprise Platform  
**Phase:** 2G-AA  
**Control:** STG-05  
**Version:** 1.0.0  
**Decision status:** TARGET_DESIGN_ACCEPTED_IMPLEMENTATION_BLOCKED  
**Date:** 2026-11-09  
**Owner:** PAY54 Enterprise Engineering Office  
**Environment:** Private staging  
**Google Cloud project:** pay54-staging-uk-01  
**Region:** europe-west2  
**Workload:** pay54-news-staging  

---

## 1. Decision

PAY54 adopts a controlled outbound network architecture as the
target design for the staging news service.

The preferred design is:

1. Google Cloud Run with internal-only ingress.
2. Cloud Run IAM authentication enabled.
3. Dedicated runtime service-account identity.
4. Direct VPC egress using ALL_TRAFFIC routing.
5. A dedicated staging VPC and regional subnet.
6. Restrictive outbound firewall policies.
7. An approved mechanism for controlling external destinations.
8. DNS and TLS validation.
9. Appropriate security logging and negative-access tests.
10. Independent security and release approval.

The design does not authorise the creation of infrastructure,
activation of third-party services or execution of financial activity.

No cloud resources may be provisioned under this ADR alone.

## 2. Context

The existing staging Terraform configuration is located at:

infrastructure/staging/main.tf

It declares:

- A Google Cloud Run v2 service.
- A dedicated deployer service account.
- A dedicated runtime service account.
- Artifact Registry infrastructure.
- A GitHub Workload Identity Federation pool and provider.
- An explicit provisioning authorisation variable.

The provisioning variable defaults to false.

The GitHub identity provider is declared disabled.

Cloud Run ingress is declared internal-only.

The invoker IAM check is declared enabled.

The service is configured to use a SHA-256-pinned container image.

The current Terraform does not declare a complete VPC outbound
enforcement architecture.

No live cloud security attestation has been completed.

## 3. Objectives

The architecture must:

- Prevent unapproved outbound data transfers.
- Preserve authenticated internal-only service ingress.
- Support explicitly approved news-provider integrations.
- Avoid storing secrets or credentials in source code.
- Reduce the potential impact of a compromised container.
- Keep infrastructure costs proportionate to staging usage.
- Provide verifiable security evidence.
- Preserve the existing PAY54 application and service behaviour.
- Support eventual transition to production infrastructure.
- Maintain a strict separation between source validation and deployment.

## 4. Current state

| Area | Current assessment |
| --- | --- |
| Cloud Run ingress declaration | Internal-only |
| Invoker IAM declaration | Enabled |
| Runtime service account | Declared |
| GitHub federation provider | Declared disabled |
| Explicit provisioning | Disabled by default |
| VPC outbound routing | Not implemented in supplied file |
| Enforced provider destination allowlist | Not verified |
| DNS and TLS controls | Not verified |
| Approved news providers | None established |
| Private database requirement | Undetermined |
| Authenticated cloud evidence | Zero |
| Independent approvals | Zero |
| STG-05 security approval | NOT_VERIFIED |
| Staging release | BLOCKED |
| Financial execution | DISABLED |

These are source-derived observations, not evidence of effective
Google Cloud runtime configuration.

## 5. Options considered

### Option A — Default Cloud Run internet egress

Description:

Allow the Cloud Run service to use its default outbound internet
connection.

Advantages:

- Minimal infrastructure complexity.
- Little additional networking configuration.
- Suitable for some development and low-risk experiments.

Disadvantages:

- Does not enforce the required destination restrictions.
- Uses a shared, dynamically allocated outbound IP pool.
- Does not provide the desired network isolation.
- Inadequate as the approved design for PAY54 staging.

Decision: REJECTED as the target staging security architecture.

### Option B — Direct VPC egress with controlled outbound access

Description:

Route all Cloud Run traffic through a dedicated staging VPC and
apply network-level egress controls.

Advantages:

- Supports explicit outbound routing.
- Supports VPC firewall enforcement.
- Can use network tags to target outbound rules.
- Avoids the need for a Serverless VPC Access connector.
- Provides a foundation for controlled private connectivity.

Limitations:

- A VPC alone is not a destination allowlist.
- IP-based firewall controls do not guarantee hostname restrictions.
- Cloud NAT, when introduced, can create ongoing costs.
- DNS, TLS, routing and negative-access tests remain necessary.
- Public provider access requires an approved internet path.

Decision: SELECTED as the target foundation.

### Option C — Serverless VPC Access connector

Description:

Use a Serverless VPC Access connector to route Cloud Run traffic
through a VPC.

Advantages:

- Established alternative to Direct VPC egress.
- Supports VPC connectivity and outbound routing.

Disadvantages:

- Adds connector lifecycle management.
- May introduce additional baseline infrastructure costs.
- Not currently justified for this staging workload.

Decision: NOT SELECTED.

May be reconsidered if testing establishes a material operational
or performance requirement.

### Option D — Managed outbound proxy

Description:

Use a controlled application-aware proxy to enforce approved
hostnames, protocols and destination rules.

Advantages:

- Can provide stronger destination-level controls.
- Can support detailed request policy and audit evidence.
- Can reduce dependence on changing provider IP addresses.

Disadvantages:

- Additional operational complexity.
- Additional security maintenance responsibilities.
- Availability, authentication and bypass prevention must be designed.
- Additional infrastructure and service costs may apply.

Decision: CONDITIONAL COMPONENT.

A proxy or equivalent application-aware enforcement layer should
be selected if provider requirements cannot be satisfied securely
through VPC policy and application controls alone.

## 6. Target architecture

The proposed architecture is:

GitHub source validation
    |
    v
Independent security review
    |
    v
Protected deployment authorisation
    |
    v
Google Cloud staging project
    |
    v
Authenticated internal Cloud Run service
    |
    v
Dedicated runtime service account
    |
    v
Direct VPC egress — ALL_TRAFFIC
    |
    v
Dedicated staging VPC and subnet
    |
    v
Restrictive egress policy
    |
    +--> Approved private Google Cloud services
    |
    +--> Controlled public internet path
              |
              +--> Approved DNS/TLS and destination policy
              |
              +--> Approved provider endpoints only

All other outbound destinations must be denied when the final
enforcement architecture is activated.

The final design must demonstrate that alternative egress routes
cannot bypass the intended restrictions.

## 7. External destination inventory

No news-provider domains have been independently established as
authorised for this workload.

The approved external destination inventory remains empty.

Before activating internet access, each destination requires:

- Legal provider or service name.
- Contract or permission status.
- Exact FQDN or approved destination range.
- Required TCP or UDP port.
- Transport protocol.
- Authentication mechanism.
- Data classification.
- Purpose and business owner.
- Residency and transfer review where applicable.
- Provider IP stability or DNS behaviour.
- Allowlist enforcement method.
- Logging and monitoring requirements.
- Approval reference.
- Expiry or review date.

External destinations may not be classified as approved merely
because they appear in application configuration.

No wildcard domains should be accepted without a documented
security exception and technical controls.

## 8. Outbound enforcement requirements

The target solution must enforce:

EGRESS-01:
All applicable Cloud Run outbound traffic must use the approved
VPC routing configuration.

EGRESS-02:
The workload must not have an uncontrolled alternative route
to the public internet.

EGRESS-03:
Unapproved outbound destinations must be blocked.

EGRESS-04:
Only necessary protocols and destination ports may be permitted.

EGRESS-05:
The destination policy must be independently reviewed.

EGRESS-06:
A request to an unapproved destination must fail safely.

EGRESS-07:
DNS changes, redirections and provider CDN behaviour must not
silently widen the approved trust boundary.

EGRESS-08:
The enforcement mechanism must remain effective after a
Cloud Run revision or infrastructure update.

EGRESS-09:
The runtime must not require broad project-level IAM roles.

EGRESS-10:
All exceptions must be time-bound, documented and reviewable.

## 9. DNS and TLS security

All external provider connections must use HTTPS unless a
separate security exception is formally approved.

Requirements:

- Validate server certificates.
- Preserve hostname verification.
- Do not disable TLS verification.
- Do not silently follow redirects to unapproved destinations.
- Apply connection and request timeouts.
- Restrict redirects and response sizes.
- Prevent requests to metadata endpoints and internal addresses.
- Review DNS rebinding and SSRF exposure.
- Avoid recording authentication credentials in application logs.

Network firewalls alone cannot establish application-layer
hostname or HTTP destination security.

The solution must identify how these additional protections
are implemented and verified.

## 10. Cloud NAT decision

Cloud NAT is not approved for provisioning under this ADR.

If public provider connectivity is required, the design may use
Cloud NAT with an approved configuration.

Before doing so, verify:

- Direct VPC all-traffic compatibility.
- Required public provider destinations.
- Whether static egress IP addresses are necessary.
- Regional NAT capacity.
- Connection and port requirements.
- Egress firewall controls.
- Logging requirements.
- Monthly operating cost.
- Availability and recovery behaviour.

Cloud NAT provides address translation and internet reachability.
It is not, by itself, a domain allowlist or a substitute for
restrictive network and application policies.

The relevant Google Cloud pricing calculator and current
regional pricing must be reviewed before approval.

## 11. Private service connectivity

The current news-service design has no confirmed requirement
for a private database.

No database, private service endpoint or database firewall
configuration is authorised by this ADR.

If a database becomes necessary, a separate decision must
establish:

- Data classification and residency.
- Required database technology.
- Private networking mechanism.
- Service authentication.
- Database least-privilege permissions.
- Encryption and backup strategy.
- Logging and retention.
- Cost and performance impact.

The architecture must not introduce a database merely to satisfy
a security checklist.

## 12. Identity and credential controls

The existing separation between deployer and runtime identities
must be preserved.

The runtime identity should receive only the permissions required
for the approved workload.

No long-lived service-account keys should be created.

GitHub Workload Identity Federation must remain disabled until
separately authorised.

Production or financial provider credentials must not be introduced
into the staging news service.

Secret Manager use, access grants, rotation and audit logging must
be independently reviewed before activation.

A source-code declaration does not prove effective IAM enforcement.

## 13. Logging and monitoring

The implemented architecture must support verification of:

- Allowed outbound connections.
- Denied outbound connections.
- Unexpected destination attempts.
- DNS or TLS validation failures.
- Network policy changes.
- Runtime identity changes.
- Cloud Run revision changes.
- Unusual outbound traffic volumes.

Logging coverage must be validated against the actual selected
network components and their supported logging capabilities.

Sensitive tokens, secret values and customer information must not
be included in logs.

Retention and monitoring settings require separate approval.

## 14. Threat-model traceability

| Threat | Required engineering response |
| --- | --- |
| EG-01 Unapproved external connection | Approved destination policy and deny tests |
| EG-02 Unauthorised service ingress | Effective ingress and IAM verification |
| EG-03 Overprivileged runtime identity | Least-privilege review and key restrictions |
| EG-04 DNS redirect or destination abuse | DNS/TLS policy, redirect and SSRF controls |
| EG-05 Premature cloud activation | Independent review and protected deployment authorisation |
| EG-06 Unapproved private-service exposure | Workload-specific private connectivity assessment |

All six threats remain OPEN.

Closing a threat requires independent evidence of effective
controls, not a successful offline source assessment alone.

## 15. Required security acceptance tests

The implementation phase must test the following:

TEST-01:
Approved service callers can reach the intended authenticated
internal endpoint.

TEST-02:
Unauthorised external callers cannot invoke the service.

TEST-03:
Known approved outbound destinations can be reached when
explicitly enabled.

TEST-04:
An unapproved public destination is denied.

TEST-05:
An unapproved destination on an otherwise permitted port is denied.

TEST-06:
DNS rebinding or redirect attempts cannot bypass destination
restrictions.

TEST-07:
TLS certificate validation rejects untrusted certificates.

TEST-08:
Application code cannot access disallowed internal or metadata
endpoints through user-influenced URLs.

TEST-09:
The runtime identity cannot access unauthorised Google Cloud
resources.

TEST-10:
Network policy remains effective after a new service revision.

TEST-11:
Security logging captures relevant denied connections and
configuration changes without exposing credentials.

TEST-12:
No unauthorised Terraform apply, cloud deployment or financial
execution occurs during source-validation workflows.

Tests that require live cloud resources must not run until
a separate security review and provisioning authorisation.

## 16. Cost-control principles

PAY54 staging must remain cost-conscious.

Decisions:

- Preserve minimum Cloud Run instances at zero where appropriate.
- Avoid unnecessary connector infrastructure.
- Do not provision Cloud NAT before approving the required public path.
- Do not purchase public IP capacity without a documented need.
- Do not create paid monitoring or logging exports by default.
- Review network data processing and transfer charges.
- Confirm all proposed services against the existing billing budget.
- Obtain a cost estimate before approving provisioning.

The existing GBP 25 monthly billing budget is an alerting control,
not a guaranteed spending limit.

Any approved infrastructure design must include a separate
cost estimate and operational owner.

## 17. Release-gate requirements

Before security approval, all the following must be satisfied:

1. The approved destination inventory is complete.
2. The final egress enforcement architecture is documented.
3. A reviewer has approved the trust boundaries.
4. The runtime IAM policy is independently verified.
5. The implementation has passed its regression tests.
6. Effective network denial tests are evidenced.
7. DNS and TLS controls are evidenced.
8. Cloud costs and operational ownership are approved.
9. Container provenance and deployment controls are approved.
10. Formal staging provisioning authorisation is recorded.

This ADR cannot grant any of these approvals.

## 18. Implementation boundary

This phase is documentation-only.

It must not:

- Modify existing Terraform resources.
- Enable Google Cloud APIs.
- Create service-account keys.
- Enable GitHub federation.
- Create VPCs or NAT gateways.
- Deploy Cloud Run services.
- Activate third-party provider integrations.
- Execute payments or financial operations.
- Change wallet balances or transaction data.
- Mark STG-05 as verified.

## 19. Status after this decision

ADR status:
TARGET_DESIGN_ACCEPTED_IMPLEMENTATION_BLOCKED

STG-05:
NOT_VERIFIED

Authenticated cloud evidence:
0

Independent security approvals:
0

Approved external destinations:
0

Cloud provisioning:
DISABLED

Financial execution:
DISABLED

Staging release:
BLOCKED

## 20. Next engineering checkpoint

Phase 2G-AB — Approved Destination Inventory and
Egress Enforcement Requirements.

The engineering team must identify the workload's actual
outbound dependencies and establish a provider-neutral policy
contract before drafting Terraform networking changes.

No infrastructure activation is authorised.

---

## References

Google Cloud — Direct VPC egress:
https://docs.cloud.google.com/run/docs/configuring/vpc-direct-vpc

Google Cloud — Cloud Run network security:
https://docs.cloud.google.com/run/docs/securing/security

Google Cloud — Networking best practices:
https://docs.cloud.google.com/run/docs/configuring/networking-best-practices

Google Cloud — Cloud NAT interactions:
https://docs.cloud.google.com/nat/docs/nat-product-interactions

Internal PAY54 sources:
- infrastructure/staging/main.tf
- backend/governance/staging-network-policy.mjs
- backend/governance/staging-egress-threat-model.json
- backend/governance/staging-egress-threat-model.mjs

END OF ADR-005
