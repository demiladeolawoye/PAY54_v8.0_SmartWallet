# CR-PAYTAG-01 — P2B-B1 Trusted Registration Admission Contract
Status: **Source-only, no registration/transfer authority.**

## Existing interfaces
The canonical bearer credential is resolved server-side by `backend/src/postgres-session-resolver.mjs` and the canonical alias is validated in `backend/domain/paytag-identity-contract.mjs`. The frontend has no right to supply a principal, account ID, wallet ID, session identity or authorisation flag.

## Admission result
The added admission function accepts precisely one client value, `proposedTag`. It requires the trusted session resolver to return an unexpired ACTIVE session with a bound account, stable principal, session ID and positive session version. Its immutable result is **not a registration authorisation** and must never be used as a prevalidated SQL write.

## Unimplemented critical operations
A future separately audited executor needs: independently provisioned NOBYPASSRLS least-privilege writer; atomic session digest and CSRF/origin proof; read-lock canonical session, account, owner membership and wallet; account status/verification recheck under SERIALIZABLE; idempotency and replay windows; database role posture inspection; authoritative alias claim and correlation-linked audit; comprehensive failure/rollback and retry tests. Neither database grants nor HTTP routes are added in this PR.

## Production constraints
No live migrations, Pages deployment, wallet transfer, account-number disclosure, recipient lookup or production feature flag. PAY54 historical Pages exposure P0 and operational fintech release gates remain open.
