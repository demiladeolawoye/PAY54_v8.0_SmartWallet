
# PAY54 Enterprise — Marketaux Outbound Security Contract

**File:** docs/governance/marketaux-outbound-security-contract.md  
**Version:** 1.0.0  
**Phase:** 2G-AF  
**Classification:** Internal security governance  
**Status:** PROPOSED — NOT APPROVED FOR DEPLOYMENT

## 1. Purpose

Define the minimum security, licensing, operational and
independent-verification requirements for outbound financial
news requests made by the PAY54 backend.

This document is a proposed control specification.

Its existence does not establish cloud attestation,
provider approval, deployment authorisation or effective
network enforcement.

## 2. Current Release Boundary

- Staging release: BLOCKED
- Financial execution: DISABLED
- Cloud provisioning: DISABLED
- Marketaux provider activation: DISABLED
- Approved outbound destination inventory: 0
- Independently authenticated cloud evidence: 0
- Independent release approvals: 0
- STG-05 security status: NOT_VERIFIED

These values describe the current release-governance baseline,
not live cloud observations.

No requirement in this document authorises changing them.

## 3. Proposed Provider Destination

Provider: Marketaux

Proposed hostname:
api.marketaux.com

Proposed protocol:
HTTPS

Proposed destination port:
443

Proposed API path:
/v1/news/all

Proposed HTTP method:
GET

Authentication:
Required api_token query parameter, as documented by Marketaux.

Approval status:
NOT_APPROVED

The provider hostname is not an unrestricted outbound
network allowlist.

Provider destinations and article publisher domains
are separate controls.

An approved article publisher must not automatically
become an approved backend network destination.

## 4. Credential Security

PAY54_NEWS_API_TOKEN must:

1. Be supplied only to an authorised backend runtime.
2. Never be embedded in public JavaScript, HTML or CSS.
3. Never be stored in source control.
4. Never appear in public API responses.
5. Never appear in application exception messages.
6. Never be exported to CI job summaries or artifacts.
7. Never be printed in access logs or traces.
8. Be subject to access restrictions and rotation procedures.
9. Be revoked promptly following suspected exposure.

The Marketaux API requires query-string token authentication
according to its published documentation.

Therefore all outbound request URLs containing api_token
must be classified as sensitive.

All relevant request logging and distributed tracing
systems must be independently assessed for URL redaction.

Application-level error sanitisation alone is insufficient.

## 5. Application Transport Requirements

The backend adapter must:

- Use a fixed, HTTPS-only provider destination.
- Disallow request-time provider URL substitution.
- Use GET with no stored browser credentials.
- Disable automatic redirect following.
- Reject unexpected HTTP redirects.
- Reject non-success provider responses.
- Apply a bounded request timeout.
- Apply bounded streamed response parsing.
- Reject unsupported response content types.
- Reject malformed provider payloads.
- Avoid exposing provider credentials in returned errors.

These requirements must be covered by automated tests.

An injected or replacement transport must provide equivalent
security guarantees before it can be trusted.

## 6. Network Enforcement Requirements

Before enabling the provider, an independent reviewer must
verify the effective runtime network configuration.

The review must establish:

- Which identities can initiate outbound traffic.
- Which routes carry the outbound requests.
- Which destinations can actually be reached.
- How destination restrictions are enforced.
- Whether direct internet egress bypasses those restrictions.
- Whether DNS resolution introduces uncontrolled destinations.
- Whether any proxy or gateway retains sensitive query strings.
- Whether outbound denial events can be audited safely.

An application hostname check is not equivalent to
network-layer enforcement.

No Terraform apply, cloud deployment or firewall change
is authorised by this document.

## 7. Provider and Publisher Separation

Provider transport:
api.marketaux.com

Article publisher:
The approved hostname in an article URL.

Publisher filtering must:

- Require explicit publisher-host configuration.
- Use HTTPS-only article URLs.
- Reject unapproved or lookalike hostnames.
- Reject unsafe URL credentials and ports.
- Reject malformed or ambiguous URLs.
- Preserve validated human-readable publisher display names.
- Avoid initiating server-side fetches to article URLs.

Publisher domain approval must not grant outbound network access.

## 8. Publication Rights

PAY54_NEWS_RIGHTS_VERIFIED is an application configuration flag.

It is not independent contractual evidence.

Before enabling external news, the responsible reviewer must
verify that the provider agreement permits the intended:

- News metadata retrieval.
- Display to PAY54 users.
- Commercial application use.
- Caching and retention.
- Attribution and linking.
- Geographic distribution.
- Redistribution, if applicable.

Any uncertainty must result in the provider remaining disabled.

## 9. Required Independent Evidence

STG-05 cannot be approved using source-code tests alone.

The evidence package must include:

1. Effective network routing and egress restrictions.
2. Applicable firewall or gateway policy.
3. Service identity and least-privilege permissions.
4. Verified logging and tracing redaction.
5. Provider authentication and rights documentation.
6. Denied-destination test results.
7. Redirect-rejection test results.
8. Confirmation that no unauthorised bypass route exists.
9. Authenticated reviewer identity.
10. Dated, independently recorded approval decision.

Evidence must be traceable to the actual reviewed
cloud project, environment and deployment configuration.

User-provided screenshots may support preliminary analysis
but do not independently establish effective enforcement.

## 10. CI Verification

Offline CI may verify:

- Static code requirements.
- Test execution.
- Configuration shape.
- Source-policy integrity.
- Absence of unauthorised provisioning behaviour.

Offline CI must not:

- Claim live network enforcement.
- Claim contractual approval.
- Activate provider credentials.
- Provision Google Cloud infrastructure.
- Deploy a live news endpoint.
- Authorise financial execution.

A successful CI run is not a staging release approval.

## 11. Change Management

Any future provider activation requires separate review of:

- Provider agreement and publication rights.
- Credential storage and access.
- Network enforcement.
- Logging and tracing.
- Runtime identity.
- Release governance.
- Rollback and incident response.

Provider activation must be separately approved and must
remain independent of wallet and ledger execution.

## 12. Release Decision

STG-05: NOT_VERIFIED

Marketaux activation: DISABLED

Staging release: BLOCKED

Cloud provisioning: DISABLED

Financial execution: DISABLED

No independent deployment authorisation is recorded here.

## 13. Reference

Marketaux official API documentation:
https://www.marketaux.com/documentation

Authentication, endpoint requirements, source metadata
and licensing obligations must be rechecked before activation.
