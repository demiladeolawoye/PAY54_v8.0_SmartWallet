# PAY54 CR-PAYTAG-01 P2B-B2B13 — PostgreSQL Connection Security and Credential Custody

## Baseline
PR #64 merged to protected `project-titan` at `436874501c4980f5d0fb85a44e72177e77f2e599`. Disposable local-socket role-switch evidence is available but is NOT evidence of TLS, credentials, IAM or production connectivity.

## Security decision
PR #65 is a source-only, provider-neutral **fail-closed requirements review**, not an authenticated PostgreSQL connection. The new module records that certificate-chain and hostname validation, private networking, workload identity, credential custody, rotation and fail-closed session isolation are mandatory. It rejects source requests that claim to have provisioned secrets or real role membership, or ask to connect, migrate or activate.

The source checker must never be advertised as actual certificate validation: no socket, PostgreSQL client, IAM connection, secret manager or TLS handshake is used. No real server name or certificate is asserted. It does not generate production credentials. The future implementation must configure `rejectUnauthorized: true`, verify hostname and certificate chain against the verified managed PostgreSQL endpoint, and explicitly reject disabled TLS or pin mismatch. Physical peer verification and the provider's documented connection model require a separate deployed integration.

## Custody and rotation requirements
Credential values are never placed in the repository, logs, GitHub PRs or chat. The approved cloud service identity must obtain secrets from a named manager at runtime with least-privilege IAM and audited access. Rotation must validate a new generation before switching traffic, drain old physical database sessions, revoke the old generation, test that old credentials no longer authenticate, and preserve an incident rollback plan without retaining live secrets in source.

## Transaction isolation and failure treatment
Every checkout must attest real `session_user`/`current_user` and role graph; enter a SERIALIZABLE transaction, switch only through an independently approved role-assumption mechanism, and reset or discard the connection on completion, rollback, pool errors and uncertain COMMIT. No transparent retry after unknown commit. Registration receipt reconciliation must be separately approved.

## Outstanding operator evidence
An actual hosting provider, approved PostgreSQL authentication model, IAM trust, private network, TLS hostname and CA, secret manager, rotation mechanism, encrypted-at-rest logs, DBA/security sign-off, change window and staging-specific rollback drill remain unverified. PR #65 neither chooses nor configures them. Canonical SQL migrations, backend routes and public Pages remain unchanged.

**Release decision: source-only for independent approval; persistent staging and production NO-GO.**
