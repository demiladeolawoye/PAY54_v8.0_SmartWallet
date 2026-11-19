# PAY54 Batch 24 / 961 — Trusted Identity, Session Bootstrap and First Account Binding

**Architecture decision:** source accepted for independent engineering review, not for deployment.
**Canonical PostgreSQL migrations:** preserve 001–018; append 019 and 020 in order.
**Operational state:** production and staging authentication issuance remain disabled.

## Trust-boundary sequence

1. A future external, contracted and configured identity authority authenticates the customer and produces a short-lived, EdDSA-signed PAY54-specific **access** assertion. It must not be an ID token or generic OAuth credential.
2. Server configuration pins the expected HTTPS issuer, audience and Ed25519 public key IDs. The verifier rejects unsigned or algorithm-confused headers, expired/future tokens, unexpected claims, wrong audience, wrong purpose and role injection. No network-driven JWKS URL comes from a request.
3. The future HTTP ingress uses a bounded canonical JSON body and HTTPS Origin verification, rejects ambiguous duplicate/framing headers, cookies and browser-asserted principal IDs. A real distributed limiter must be provisioned independently; no browser-side or in-memory rate-limit success is accepted.
4. The trusted issuer service passes the **verified** principal, issuer and assertion JTI to migration 019 through the isolated callable role `pay54_session_issue_role`. The callable role has **EXECUTE only**; a different NOLOGIN/NOBYPASSRLS restricted SECURITY DEFINER owns the function.
5. In one PostgreSQL transaction, `pay54.identity_assertion_receipts` atomically consumes the unique (issuer, JTI), and a new random-token-digest session is inserted with `active_account_id=NULL` and expiry no later than the assertion and five minutes. Credentials are returned by the server only after confirmed COMMIT.
6. The customer must then request an initial account through a separate authenticated and CSRF-verified transition. Migration 020 locks the unbound session, validates principal-owned Personal or active Business membership, revokes the old token, issues the new account-bound digest and appends one durable account-context audit record atomically. It shares the hardened server transition adapter from Batch 23 with later account changes.
7. Financial permission is never inferred from bootstrap issuance or account context. The protected foundation backend still returns 503 for context operations and financial execution; the prospective login route is not mounted.

## Security architecture

- No direct session-table DML or account/ledger grant to the caller. Both the issuance function owner and transition function owner have fixed `search_path`, force RLS and NOLOGIN/NOBYPASSRLS identities, with no role memberships from this batch.
- Unique issuer/JTI receipt and unique token digests prevent replay and double issuance. SQL rollback guarantees receipt and new session cannot diverge on errors. Existing Account Context/financial ownership is not rewritten.
- COMMIT ambiguity discards the driver connection and suppresses raw credential release. An unknown outcome requires a new independently signed assertion and reauthentication; it never automatically resubmits the same jti.
- Source code assumes a **trusted identity service and role-isolated database connections**. A compromised backend with callable-role credentials could call SQL with arbitrary principal parameters: independent IAM, network isolation, signed access-token validation, audit and runtime service isolation remain mandatory before any login is wired.
- The production session issuance, registration, customer recovery, MFA/step-up and actual identity-provider partnership are not implemented. Staging database provisioning is a separate approved operational change.

## Release prerequisites

Only immutable, exact-head passing CI, independent security review of both SECURITY DEFINER functions, real TLS identity-issuer integration, PostgreSQL role-to-login grants, penetration tests, GDPR/data-retention review, device QA, account cache isolation, protected Pages artifact and release rollback can support a controlled staging decision. Regulated partner and safeguarding acceptance remain separate production gates.

**CTO disposition:** Design and source-level security proof only. No launch, database migration or money movement authorised.
