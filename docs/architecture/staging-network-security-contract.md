
# PAY54 Enterprise — Staging Network Security Contract

**File:** `docs/architecture/staging-network-security-contract.md`  
**Version:** 1.0.0  
**Phase:** 2G-AN  
**Control:** STG-05 — Private Networking and Egress Security  
**Classification:** Internal Engineering and Security Governance  
**Document status:** Proposed design — not independently approved  
**Staging release:** BLOCKED  
**Cloud provisioning:** DISABLED  
**Financial execution:** DISABLED  
**External news-provider activation:** DISABLED

---

## 1. Purpose

This document establishes the proposed network security architecture and
verification requirements for PAY54's private Google Cloud staging
environment.

It defines mandatory security boundaries for:

- Private service ingress
- Outbound network routing
- VPC and subnet isolation
- Firewall enforcement
- External destination control
- Workload identity
- Credential protection
- Network observability
- Infrastructure change governance
- Independent security verification

This document is a design contract.

It does not provision cloud infrastructure, enable APIs, authorise access
to external providers, execute financial transactions or approve staging
release.

## 2. Scope

The proposed staging project is:

`pay54-staging-uk-01`

The intended Google Cloud region is:

`europe-west2`

The initial isolated workload is:

`pay54-news-staging`

The existing Terraform source is:

`infrastructure/staging/main.tf`

The contract covers the isolated financial news staging workload and
establishes reusable principles for future PAY54 backend services.

It does not authorise a production banking system, customer-data
processing or live financial operations.

## 3. Current Verified and Unverified Position

### 3.1 Evidence observed in Google Cloud

The following observations are based on the engineering review of
Google Cloud console screenshots and recordings supplied during
November 2026.

| Component | Observation |
|---|---|
| Staging project | PAY54 Staging project selected |
| Billing | Staging project observed linked to PAY54 Staging Billing |
| Budget | Monthly £25 budget observed |
| Budget alerts | 50%, 80% and 100% thresholds observed |
| Email notifications | Billing administrator/user notification setting observed enabled |
| Secret Manager | No standard secrets listed |
| Human IAM | One project-level Owner principal visible |
| User-managed service accounts | None listed |
| Workload Identity Pools | No pools displayed |
| Compute Engine API | Enable button displayed, indicating disabled status |
| VPC inventory | Unable to retrieve network list |
| External provider approval | No approval established |
| Independent security approval | Not established |

The absence of resources from a successfully loaded inventory and a
failed inventory request must not be treated as equivalent evidence.

The VPC console returned an error. Consequently, the number and
configuration of existing VPC networks remain unverified.

### 3.2 Existing Terraform source observations

The supplied version of `infrastructure/staging/main.tf` declares:

- Google Cloud region `europe-west2`
- A Cloud Run service named `pay54-news-staging`
- `INGRESS_TRAFFIC_INTERNAL_ONLY`
- `invoker_iam_disabled = false`
- Deletion protection
- Dedicated deployer and runtime service-account resources
- A restricted GitHub Workload Identity Federation design
- A disabled GitHub identity provider
- Explicit provisioning authorisation defaulting to false
- A container image pinned by SHA-256 digest
- Cloud Run scaling limited to one instance

These declarations are source-level design controls.

They do not prove that infrastructure has been created or that the
declared settings are effective in Google Cloud.

### 3.3 Gaps identified in the supplied Terraform

The supplied Terraform does not demonstrate:

- Dedicated VPC creation
- Dedicated regional subnet creation
- Cloud Run Direct VPC egress configuration
- All-traffic VPC routing
- Explicit egress firewall restrictions
- Effective external destination allowlisting
- DNS egress enforcement
- Approved internet egress gateway or proxy
- Network flow logging
- Authenticated network-security test evidence

These gaps must be addressed before STG-05 can be approved.

## 4. Architecture Principles

The following principles are mandatory for the proposed design.

### 4.1 Deny by default

Unapproved outbound connections must be denied by effective network
controls.

Application-level URL validation is supplementary and must not be
treated as a replacement for network enforcement.

### 4.2 Separation of responsibilities

The following responsibilities must remain separate:

1. Infrastructure administration
2. Deployment automation
3. Application runtime
4. Secret administration
5. Security review and approval

A runtime service must not inherit project Owner or Editor privileges.

### 4.3 Private authenticated ingress

Staging application endpoints must be private and authenticated.

Public unauthenticated invocation is not permitted.

### 4.4 Explicit outbound authorisation

An external destination must not become accessible merely because an
application contains its URL.

Each external dependency requires:

- A documented business purpose
- A verified provider identity
- Contractual and licensing review where applicable
- Explicit security approval
- Technical enforcement
- Test evidence

### 4.5 Independent verification

Source code, test reports and cloud screenshots are different forms of
evidence.

No single source-level declaration is sufficient to establish live
security enforcement.

## 5. Proposed Logical Architecture

The intended architecture is:

```text
                  PAY54 PRIVATE STAGING
                          |
                          v
              Authenticated Internal Access
                          |
                          v
                 Cloud Run Service
                 pay54-news-staging
                          |
                          v
                Dedicated Runtime Identity
                          |
                          v
                   Direct VPC Egress
                          |
                          v
                 Dedicated Staging Subnet
                          |
                          v
               All-Traffic Routing Policy
                          |
                          v
                 Egress Firewall Controls
                          |
                          v
               Controlled Outbound Gateway
                          |
              +-----------+-----------+
              |                       |
              v                       v
       Approved Internal       Approved External
         Dependencies            Destinations
              |                       |
              +-----------+-----------+
                          |
                          v
              Audit and Security Monitoring
```

This is a target design, not an existing deployed topology.

The final egress design must be proven to enforce the intended
destination restrictions.

## 6. VPC Network Requirements

### NET-001 — Dedicated staging network

PAY54 staging must use a deliberately configured VPC network with
documented ownership and purpose.

The default VPC must not be accepted as the staging network without
a documented security review and separate approval.

### NET-002 — Regional subnet

The workload must use a subnet in the approved staging region.

Subnet addressing, capacity and overlap with any existing PAY54 or
partner-connected networks must be reviewed before allocation.

No subnet CIDR is approved by this document.

### NET-003 — Environment isolation

Development, staging and production network permissions must be
segregated.

Staging identities must not obtain production access through shared
network configuration or inherited IAM grants.

### NET-004 — Network inventory

Before provisioning, the engineering team must establish the existing
VPC and subnet inventory from authenticated Google Cloud evidence.

The current inventory remains unverified because the Compute Engine
API is disabled and the console retrieval failed.

## 7. Cloud Run Requirements

### RUN-001 — Internal ingress

The Cloud Run service must retain:

`INGRESS_TRAFFIC_INTERNAL_ONLY`

The effective configuration must be verified after authorised
provisioning.

### RUN-002 — Authentication

Cloud Run invocation must require a specifically authorised identity.

The setting `invoker_iam_disabled = false` must be supplemented by a
review of the effective Cloud Run IAM policy.

No broad unauthenticated invoker grant is permitted.

### RUN-003 — Dedicated identity

The service must execute using a dedicated PAY54 staging runtime
service account.

It must not use an administrative human identity or privileged
deployment account.

### RUN-004 — Direct VPC egress

The preferred design is Direct VPC egress, subject to platform
compatibility, network requirements and cost review.

The chosen implementation must explicitly connect the workload to
the approved VPC and subnet.

### RUN-005 — All-traffic egress

The intended outbound mode is:

`ALL_TRAFFIC`

A configuration that routes only private address ranges through the
VPC is not sufficient to enforce internet destination restrictions.

The effective setting must be independently verified.

### RUN-006 — Resource limits

The existing staging service scaling and resource limits must remain
bounded.

Any increase requires cost and security review.

## 8. Egress Security Requirements

### EGR-001 — Explicit restrictions

Unapproved outbound destinations must be denied through effective
network enforcement.

Relying only on an application hostname check is prohibited.

### EGR-002 — Controlled internet access

An approved gateway or proxy architecture must be selected before
internet egress is enabled.

Potential approaches may include:

- A security-controlled outbound proxy
- A policy-enforcing gateway
- An approved combination of routing, firewall and application-layer
  destination restrictions

The selection must account for operational complexity, bypass
prevention, availability and cost.

### EGR-003 — Firewall enforcement

Firewall rules must restrict the workload's outbound access.

The implementation must account for Google Cloud's effective firewall
evaluation, implied rules, inherited policies and workload network
tags.

An explicit deny rule must not be described as effective until its
priority and interaction with other applicable policies are verified.

### EGR-004 — DNS controls

The implementation must define approved DNS resolution behaviour.

Security testing must assess:

- Resolution of unauthorised domains
- Direct-IP connection attempts
- Alternative DNS resolvers
- DNS-over-HTTPS attempts
- Hostname and address changes
- Proxy bypass attempts

A destination hostname list alone does not provide complete
network isolation.

### EGR-005 — TLS protection

Permitted external HTTPS traffic must use verified TLS connections.

The application must not disable certificate validation.

Credentials and sensitive request metadata must not be recorded in
diagnostic logs.

### EGR-006 — Destination changes

Adding an outbound destination is a governed infrastructure and
provider-security change.

No destination may be added solely by changing an application
environment variable.

## 9. External News Provider Boundary

The Marketaux provider endpoint identified during source inspection is:

`https://api.marketaux.com/v1/news/all`

This is an observed source dependency, not an approved outbound
destination.

Current requirements:

- Marketaux activation remains disabled
- Provider credentials must not be added
- No outbound rule must be created solely to allow Marketaux
- Publisher display rights remain subject to independent verification
- No provider request is authorised by this contract

The existing source-level provider validation and bounded-response
controls remain useful defence-in-depth measures.

They do not replace transport-layer restrictions or licensing approval.

## 10. Outbound Destination Register

Before external egress is activated, an approved register must exist.

Every entry must contain:

| Field | Requirement |
|---|---|
| Destination identifier | Unique governed identifier |
| Destination hostname | Exact approved DNS name |
| Provider | Verified legal or service entity |
| Purpose | Documented business necessity |
| Protocol | Explicit permitted protocol |
| Port | Explicit permitted destination port |
| Environment | Staging-only or separately approved scope |
| Data classification | Classification of transmitted information |
| Contractual approval | Recorded where applicable |
| Security approval | Independent authorisation |
| Technical control | Enforced gateway/firewall/proxy reference |
| Test evidence | Positive and negative verification |
| Expiry/review date | Defined reauthorisation point |
| Owner | Accountable engineering or service owner |

Current approved external destinations:

**None.**

No provider is authorised by inclusion in this document.

## 11. Identity and Access Management

### IAM-001 — Dedicated service accounts

The intended identities are:

- `pay54-staging-deployer`
- `pay54-staging-runtime`

These are Terraform source definitions and have not been verified
as deployed resources.

### IAM-002 — Least privilege

Runtime identities must receive only the roles required for their
approved operations.

Project Owner and Editor roles are prohibited for application runtime.

### IAM-003 — GitHub federation

GitHub Actions authentication must use independently reviewed,
restricted workload identity federation.

The existing Terraform source declares the identity provider disabled.

That restriction must remain effective until a separate release
authorisation process is completed.

### IAM-004 — No long-lived deployment keys

Long-lived service-account keys must not be introduced as a workaround
for incomplete workload identity configuration.

### IAM-005 — Independent review

A trusted security reviewer must verify the effective role bindings,
service identities and workload identity claims before activation.

## 12. Secret Management Requirements

### SEC-001 — Secret storage

Approved credentials must be stored in a centrally governed secret
management system.

Credentials must not be committed to GitHub or embedded in application
source files.

### SEC-002 — Scoped access

Secret access must be granted to the intended runtime identity on
the narrowest practical scope.

### SEC-003 — No premature activation

The current absence of provider secrets is acceptable.

This contract does not authorise secret creation, credential import,
rotation operations or external provider access.

### SEC-004 — Auditability

Secret access permissions and logging requirements must be reviewed
before credentials are created.

## 13. Network Monitoring Requirements

### OBS-001 — Flow visibility

The proposed network design must provide sufficient flow visibility
to investigate permitted and denied traffic.

The implementation must document any limitations in VPC Flow Logs
coverage and sampling.

### OBS-002 — Denied traffic

Security monitoring must capture actionable evidence of denied
connection attempts through supported firewall and gateway logging.

### OBS-003 — Sensitive information

Logs must not expose API tokens, authorisation headers or customer
financial information.

### OBS-004 — Retention

Log retention, access controls and associated costs require approval
before the monitoring configuration is deployed.

### OBS-005 — Incident response

A responsible engineering owner must be assigned for suspected
unauthorised outbound activity.

The incident response process must include containment, evidence
preservation and escalation.

## 14. Infrastructure Change Governance

### GOV-001 — Terraform control

All planned PAY54 network resources should be managed through
reviewed infrastructure-as-code changes.

Manual console creation must not be used to bypass the approved
provisioning process.

### GOV-002 — Disabled-by-default provisioning

The existing Terraform input:

`authorized_provisioning = false`

must remain unchanged in the current development baseline.

### GOV-003 — Separate activation approval

The following changes require separately documented approval:

- Enabling required cloud APIs
- Creating a VPC or subnet
- Creating a Cloud NAT gateway or outbound proxy
- Creating network firewall policies
- Deploying or updating Cloud Run
- Activating workload identity federation
- Creating or importing secrets
- Enabling any external provider

### GOV-004 — No automatic CI deployment

Repository CI must not receive general cloud provisioning privileges
as a consequence of this contract.

Static validation and source-policy checks may continue without
cloud credentials.

### GOV-005 — Cost approval

Before implementing networking components, the engineering team must
produce a realistic cost estimate.

The current £25 monthly budget is a notification threshold, not a
guaranteed spending limit.

Potential costs must include:

- Cloud Run execution
- VPC networking
- NAT or proxy infrastructure
- Network traffic
- Logging and monitoring
- Any security gateway or managed inspection service

The final design must remain economically appropriate for PAY54's
current pre-production stage.

## 15. Security Verification Plan

The following tests are required before STG-05 approval.

### 15.1 Static source verification

Verify:

1. Provisioning remains disabled by default.
2. Cloud Run ingress is internal-only.
3. Authentication is required.
4. Runtime identity is dedicated.
5. All-traffic VPC egress is explicitly specified in the approved
   implementation.
6. Network resources are regionally scoped as intended.
7. Firewall and gateway configuration is explicit.
8. No unapproved outbound destination is included.
9. No credentials or long-lived keys are embedded.
10. CI cannot trigger an unauthorised deployment.

Static checks must not be reported as proof of effective cloud
configuration.

### 15.2 Authenticated cloud configuration review

After separately authorised provisioning, verify:

1. Project and region.
2. VPC and subnet identity.
3. Cloud Run network attachment.
4. Actual all-traffic routing.
5. Effective IAM bindings.
6. Applicable firewall rules and priorities.
7. Gateway/proxy configuration.
8. Secret access policies.
9. Logging configuration.
10. Infrastructure drift against reviewed Terraform.

All collected evidence must be timestamped and traceable to the
approved environment.

### 15.3 Controlled network security tests

Only in a separately approved test environment, verify:

| Test | Expected outcome |
|---|---|
| Approved internal connection | Succeeds when specifically authorised |
| Unapproved external hostname | Blocked |
| Unapproved external IP address | Blocked |
| Unapproved TCP port | Blocked |
| Alternative DNS resolution | Unable to bypass policy |
| Direct-IP HTTPS request | Unable to bypass policy |
| Redirect to unapproved destination | Blocked |
| Proxy bypass attempt | Blocked |
| Unauthenticated Cloud Run request | Denied |
| Unauthorised runtime principal | Denied |
| External provider request while disabled | No provider request occurs |
| Security log review | Relevant evidence available without secret disclosure |

Negative test results must be based on effective runtime behaviour,
not assumptions inferred from Terraform declarations.

No test may use real customer funds or financial instructions.

## 16. Evidence Requirements

STG-05 evidence must include:

- Reviewed network architecture
- Approved destination inventory
- Versioned Terraform change references
- Static validation results
- Authenticated cloud resource inventory
- Effective IAM policy evidence
- Effective firewall/gateway configuration
- Positive and negative network test results
- Monitoring evidence
- Cost assessment
- Independent security reviewer decision

Evidence must clearly distinguish:

- Proposed design
- Source-level configuration
- Observed cloud configuration
- Independently verified enforcement

## 17. Acceptance Criteria

STG-05 must remain `NOT_VERIFIED` until all required controls
are independently assessed.

Approval requires:

1. Completed and reviewed network design.
2. Explicitly approved outbound destination register.
3. Authorised infrastructure implementation.
4. Verified all-traffic VPC routing.
5. Effective egress restrictions.
6. Verified private authenticated ingress.
7. Least-privilege runtime and deployment identities.
8. Approved secret access model.
9. Adequate monitoring and audit evidence.
10. Successful controlled security tests.
11. Approved infrastructure cost assessment.
12. Independent security sign-off.

Passing the source checks alone must never promote the control to
`VERIFIED`.

## 18. Current Decision Record

**Decision:** Adopt the proposed STG-05 network security requirements
as the basis for future infrastructure design.

**Current implementation status:** Not implemented.

**Current independent verification status:** Not verified.

**Current provisioning status:** Disabled.

**Current external destination approvals:** Zero.

**Current financial execution status:** Disabled.

**Current staging release status:** Blocked.

This architecture contract does not change those statuses.

## 19. Dependencies

STG-05 implementation depends on completion of the relevant security
and governance requirements, including:

- STG-01 — Independent security reviewer
- STG-02 — Verified cloud project and billing
- STG-03 — Secret Manager and identity access controls
- STG-04 — Budget monitoring and cost governance
- STG-06 — Signed container provenance
- STG-07 — Formal provisioning authorisation

No dependency is automatically approved by this document.

## 20. Recommended Engineering Sequence

The next stages should be:

1. Commit this documentation-only architecture contract.
2. Confirm the contract against current Terraform source.
3. Prepare an offline network implementation design.
4. Define network source-policy regression tests.
5. Review expected resource costs.
6. Conduct independent security architecture review.
7. Obtain separate infrastructure authorisation where justified.
8. Implement through reviewed Terraform changes.
9. Collect authenticated cloud security evidence.
10. Perform controlled verification before requesting STG-05 approval.

## 21. Final Security Statement

PAY54's future private staging infrastructure must demonstrate
effective inbound and outbound network security.

Internal-only ingress, authenticated invocation, application-level
URL validation and disabled-by-default provider configuration are
valuable controls, but do not alone establish controlled network
egress.

Until effective enforcement is implemented and independently verified:

**STG-05 remains NOT_VERIFIED.**

**Staging release remains BLOCKED.**

**Cloud provisioning remains DISABLED.**

**External financial news access remains DISABLED.**

**Real-money financial execution remains DISABLED.**

---

**Document owner:** PAY54 Enterprise Engineering Office  
**Review authority:** Independent PAY54 Security Reviewer — not yet assigned  
**Approval status:** PROPOSED — PENDING INDEPENDENT SECURITY REVIEW
