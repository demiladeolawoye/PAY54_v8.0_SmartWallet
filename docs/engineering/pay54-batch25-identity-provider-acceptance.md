# PAY54 Batch 25 / 1012 — Identity Provider Due Diligence and Integration Acceptance

**Decision:** PAY54's source has offline Ed25519 access-token verification, unique issuer/JTI SQL consumption and initial account binding. It does **not** have a contracted customer identity authority, live MFA/reauth service or mounted bootstrap route.

## Selection and contracting

Select a trusted identity/KYC provider with documented UK and Nigeria coverage, data-controller/processor obligations, cross-border transfer mechanisms, fraud controls, customer support, availability, recovery and breach notification SLAs. Separate identity authentication from regulated money handling and from country-specific sanctions/KYB.

Require a dedicated backend-issued short-lived PAY54 **access** assertion, rather than trusting a generic ID token. Enforce pinned issuer/audience/EdDSA `at+jwt`, UUID subject and unique assertion JTI, `pay54:session:issue` purpose, iat/nbf/exp and a five-minute maximum lifetime. Verify signature and hard expiry using independently provisioned trust keys, not user-supplied JWKS. Design key rollover with overlapping valid public keys and immediate revocation capability.

## Integration and operations

Use an approved identity-provider hosted login or secure authorisation-code/PKCE flow, with MFA/step-up appropriate to fintech risk. A future server-side issuance boundary must call the existing signed assertion verifier before any restricted database function; the SQL function itself **does not verify a JWT**. Never expose `pay54_session_issue_role` to a public client or a generic database login.

Provision distributed atomic login limits and abuse monitoring; rate-limit failures deny authentication. On unique JTI replay or uncertain COMMIT, require a **fresh independently signed assertion**, not blind retry. Bootstrap session remains unbound until an explicit authorised account selection rotates old credentials and writes audit.

## Acceptance

Security signs real IdP trust keys, signed JWT samples, key-revocation incident drill, token/CSRF log redaction, cross-principal replay, session revocation, secure Origin/CORS, phishing-resistant MFA strategy, regulator-appropriate recovery and GDPR data retention. Independent staging QA signs real devices and ten-domain account cache isolation. Founder/Compliance/Release approval is separate from source CI.

**Current status:** Identity provider NOT CONNECTED, customer login NOT ACTIVE, account HTTP routes unchanged, production NO-GO.