
# PAY54 Enterprise — Marketaux Transport Trust Audit

**File:** docs/governance/marketaux-transport-trust-audit.md  
**Version:** 1.0.0  
**Phase:** 2G-AI  
**Classification:** Internal security engineering  
**Assessment:** SOURCE REVIEW — NOT LIVE ATTESTATION  
**Release decision:** BLOCKED

## 1. Purpose

Assess the Marketaux outbound transport security boundary
before further adapter changes or external news activation.

The assessment separates:

- Verified source-code behaviour
- Behaviour demonstrated by regression tests
- Design assumptions
- Operational controls requiring independent verification

This document does not authorise deployment, cloud
provisioning, provider activation or financial execution.

## 2. Reviewed Source Baseline

The review uses PAY54 source code previously supplied
for the following modules:

- backend/news/marketaux-adapter.mjs
- backend/news/news-integration.mjs
- backend/news/news-http-handler.mjs
- backend/news/news-service.mjs
- backend/news/news-feed-policy.mjs

Relevant regression suites include:

- backend/tests/marketaux-adapter.test.mjs
- backend/tests/marketaux-transport-security.test.mjs
- backend/tests/marketaux-response-destination.test.mjs
- backend/tests/news-integration-security.test.mjs
- backend/tests/news-feed-policy.test.mjs

The reviewed Marketaux adapter baseline is v1.1.0.

The source reviewed here was supplied in the PAY54
engineering conversation.

The exact current Git commit contents and complete
GitHub Actions workflow configuration have not been
independently re-read during this audit.

## 3. Existing Security Controls

### 3.1 Provider activation

The adapter defaults to disabled.

Enabled operation requires:

- Explicit enablement
- A verified-rights configuration flag
- A server-side API token
- Approved publisher hostnames
- A valid backend fetch implementation

These are source-level requirements.

The rights flag itself is not evidence of an
executed provider agreement.

### 3.2 Request destination

The adapter constructs requests using:

https://api.marketaux.com/v1/news/all

The request method is GET.

Automatic redirect following is disabled through
the fetch request options.

A successful response is required to report HTTP 200.

### 3.3 Final response metadata

The v1.1.0 adapter rejects a response when:

- response.redirected is true
- response.url has an invalid non-string value
- A non-empty response.url differs from the requested URL

The adapter continues to accept an empty response.url
to preserve existing in-memory test compatibility.

This is a documented trust limitation.

### 3.4 Response protection

The adapter applies:

- Request timeout and abort signalling
- Maximum streamed response size
- Content-type validation
- JSON parsing validation
- Article host filtering
- Generic credential-safe error messages

These controls reduce application-level exposure.

They do not establish the behaviour of external
network gateways, logging agents or proxies.

### 3.5 News API boundary

The news integration and HTTP handler:

- Do not start an HTTP server themselves
- Return unavailable state when disabled
- Do not expose the configured API token in feed output
- Apply no-store response headers
- Reject unsupported HTTP methods
- Use an approved-news selection policy

These controls do not authorise a public endpoint.

## 4. Finding AI-01 — Missing Final URL Evidence

**Severity:** HIGH  
**Status:** OPEN  
**Category:** Transport trust

The current adapter permits a response containing an
empty response.url.

Native test fixtures may intentionally supply an empty
URL, and existing tests rely on this compatibility.

However, a response without final URL metadata does
not independently demonstrate the final network
destination.

### Required remediation

Introduce a separately reviewed production
transport boundary that:

1. Uses an approved backend transport implementation.
2. Rejects missing final destination evidence where
   that evidence is part of the production trust contract.
3. Preserves existing in-memory tests without silently
   weakening production checks.
4. Prevents untrusted callers from selecting arbitrary
   provider destinations.
5. Avoids duplicating Marketaux business logic.

Do not implement this change until the runtime
composition and transport ownership have been reviewed.

**Closure evidence:**
Production-boundary tests, reviewed runtime composition
and an independent security decision.

## 5. Finding AI-02 — Query-String Credential Exposure

**Severity:** HIGH  
**Status:** OPEN  
**Category:** Credential protection

Marketaux documents API token authentication using
the api_token query parameter.

Accordingly, the complete outbound request URL
contains a sensitive credential.

Any transport wrapper, HTTP diagnostic system,
proxy, tracing agent or access logger capable of
capturing the full URL could expose that credential.

Generic application error messages alone do not
eliminate this risk.

### Required controls

1. The token must remain server-side.
2. The complete provider URL must not enter logs.
3. Tracing must remove sensitive query parameters.
4. Error reporting must not include request URLs.
5. Monitoring attributes must exclude API tokens.
6. CI must not export provider credentials.
7. Token access must be least-privilege.
8. Token rotation and incident response must be defined.

### Required evidence

- Runtime logging configuration
- HTTP client instrumentation configuration
- Tracing attribute and redaction configuration
- Proxy or gateway log policy
- Sanitised test evidence demonstrating redaction
- Independent reviewer approval

Do not use a real production API token in security tests.

## 6. Finding AI-03 — Network Egress Not Attested

**Severity:** HIGH  
**Status:** OPEN  
**Category:** Network enforcement

Application code targets a fixed Marketaux hostname.

This does not independently demonstrate that the
deployed runtime can contact only authorised
outbound destinations.

### Proposed provider destination

Hostname: api.marketaux.com

Protocol: HTTPS

Port: 443

Approval: NOT_APPROVED

This is a proposed destination, not an activated
firewall or gateway rule.

### Required independent checks

- Effective Cloud Run egress configuration
- Applicable VPC routing
- Effective firewall or proxy restrictions
- DNS resolution behaviour
- Direct internet bypass possibilities
- Runtime service account privileges
- Denied-destination test results
- Credential-safe network audit logging

Any future live verification must be separately
authorised and must not enable financial execution.

## 7. Finding AI-04 — Runtime Composition Not Verified

**Severity:** MEDIUM  
**Status:** OPEN  
**Category:** Service integration

The news integration accepts an injected fetch
implementation.

This is useful for deterministic tests and
dependency injection.

However, the security properties of the injected
implementation depend on its actual runtime
configuration and the code that supplies it.

### Required review

Identify the production composition root that
constructs the news integration.

Verify:

- How fetchImpl is selected
- Whether it is native fetch or a wrapper
- Whether logging interceptors are attached
- Whether tracing interceptors record full URLs
- Whether request hooks can redirect traffic
- Whether environment flags are loaded securely
- Whether disabled mode remains the default

Do not infer runtime wiring from the adapter alone.

## 8. Finding AI-05 — CI Scope Needs Reconciliation

**Severity:** MEDIUM  
**Status:** OPEN  
**Category:** Verification integrity

Successful GitHub Actions runs have been observed
for the PAY54 backend test workflow.

Those results establish that the relevant workflow
jobs reported success.

They do not, without the corresponding job logs and
workflow source, independently establish:

- Which exact test files were executed
- Whether all security test assertions ran
- Whether tests were skipped
- Whether coverage was complete
- Whether cloud controls were verified

### Required evidence

Review the complete source of:

.github/workflows/pay54-backend-tests.yml

Review the latest relevant GitHub Actions job logs.

Record:

- Commit SHA
- Node.js version
- Test runner command
- Included test paths
- Test counts
- Passed, failed and skipped results
- Workflow permissions
- Credential availability

CI must remain non-provisioning for this assessment.

## 9. Publisher Identity Separation

The Marketaux provider hostname and approved article
publisher hostnames are different security concepts.

A publisher domain approved for article display
must not automatically be permitted for backend
outbound network requests.

The backend must not fetch article URLs merely
because they passed news metadata validation.

Publication rights and technical hostname
validation remain separate requirements.

## 10. Test Strategy

Future regression testing must include:

- Disabled-by-default transport
- Fixed request destination
- Redirect rejection
- Empty final URL handling
- Wrong final URL handling
- Invalid response metadata
- HTTP error responses
- Provider timeout
- Oversized streamed responses
- Credential-safe error handling
- Credential redaction at runtime logging boundaries
- Publisher allowlist validation
- No unauthorised financial operations

Tests must use synthetic credentials and controlled
in-memory providers unless a separate authorised
environment test is approved.

No test should rely on live Marketaux availability.

## 11. Architecture Decision

Continue separating the platform into:

Core
  -> Infrastructure
  -> Services
  -> Engines
  -> Modules
  -> UI
  -> Dashboard
  -> Mobile Apps
  -> Production

The Marketaux adapter is a provider integration,
not an authority for network security or
release approval.

The runtime composition root must own the
selection of trusted transport dependencies.

Infrastructure controls must independently enforce
the permitted network boundary.

Governance controls must independently approve
provider rights, security readiness and release.

## 12. Required Engineering Sequence

### Stage AI-A — Source and workflow audit

- Record adapter security behaviour
- Review runtime composition
- Review backend test workflow source
- Record open security assumptions

### Stage AI-B — Test-first transport boundary

- Add focused trust-boundary regression tests
- Preserve existing adapter interface
- Avoid duplicating validation logic
- Confirm compatibility with existing test fixtures

### Stage AI-C — Credential observability review

- Review logging and tracing instrumentation
- Define and verify query-parameter redaction
- Use synthetic credentials
- Avoid external network calls

### Stage AI-D — Independent cloud verification

- Obtain explicit authorisation
- Verify live networking controls
- Confirm denied-destination enforcement
- Collect authenticated evidence
- Obtain independent security approval

Stage AI-D is not authorised by this document.

## 13. Release Status

Source-review milestone: DOCUMENTED

Marketaux transport trust: NOT_VERIFIED

Credential logging redaction: NOT_VERIFIED

Effective outbound enforcement: NOT_VERIFIED

Provider publication rights: NOT_VERIFIED

STG-05 security approval: NOT_VERIFIED

Cloud provisioning: DISABLED

Financial execution: DISABLED

Staging release: BLOCKED

## 14. Final Decision

This assessment records source-level protections and
open operational security requirements.

It does not establish that the production transport
is trusted or that the cloud environment is secure.

No release, provider activation, infrastructure
provisioning or financial execution is authorised.

An independent reviewer must verify the applicable
evidence before any blocked control can change.
