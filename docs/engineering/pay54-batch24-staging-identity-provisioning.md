# PAY54 Batch 24 / 962 — Controlled Identity Staging Provisioning

**Status: operator procedure, not an executed change.** Neither a PAY54 staging identity provider nor PostgreSQL account/login infrastructure has been provisioned by this PR.

## Operator-owned prerequisites

- Select the actual regulated and security-reviewed identity service/partner, document UK GDPR processing basis, minimum identity assurance, MFA and customer account recovery obligations.
- Establish independent OIDC/OAuth authorisation-code/PKCE onboarding, if applicable, and define a dedicated short-lived PAY54 access assertion with EdDSA, exact `at+jwt` purpose, issuer, audience, subject UUID, JTI UUID, iat/nbf/exp and scope `pay54:session:issue`. Never treat an ID token as a PAY54 session bearer.
- Generate signing keys within approved KMS/HSM. Provision only **public** Ed25519 keys to staging runtime via secret-controlled config. Define dual-key overlap, revocation, expiry, rotation and incident recovery. No private key or browser-supplied JWKS endpoint may enter the repository or Pages.
- Require staging-only TLS, strict Origin, bounded content-type/framing, distributed atomic rate limiter, security monitoring, breach alarms and redacted audit retention.
- DBA reviews canonical migrations 001–018 plus additive 019–020, verifies exact SHA-256, backups and PITR restore, and applies them under a short-lived migration owner to a nonproduction cluster.
- Security/DBA independently grant **only EXECUTE** of issuer/binding functions to separately provisioned staging login identities. Do not grant login to function owners, table owners, ledger roles or BYPASSRLS. Verify effective `current_user` and actual PostgreSQL ACL/RLS during every security staging probe.
- Isolate identity verification, issuer SQL and account-read/rotation pools. Provision credentials in approved secret manager with key rotation, minimal network egress and no plaintext console output.

## Manual staging acceptance order

1. Prove signature, key-ID, issuer, audience, JTI and time-window failures with real contracted IdP test keys.
2. Prove one-time JTI consumption across concurrent service instances and DB failover; verify a single bootstrap receipt/session after failures.
3. Validate initial account binding with separate authorised Personal and Business users, revoked memberships, suspended verification, stale tokens and forged CSRF.
4. Verify no raw access tokens/CSRF in logs, distributed tracing, database statement logs, support tooling or Pages artifacts.
5. Exercise unknown COMMIT with forced driver disconnect. Require reauthentication; never return a guessed token.
6. Verify Android/iOS/browser accessibility and all ten account-scoped cache domains, then validate independent wallet/ledger permissions.
7. Sign rollback, incident response, privilege review, branch protection/OIDC and Pages containment before requesting a limited staging trial.

**No live action has been performed.** Production remains NO-GO until all financial compliance and release gates pass.
