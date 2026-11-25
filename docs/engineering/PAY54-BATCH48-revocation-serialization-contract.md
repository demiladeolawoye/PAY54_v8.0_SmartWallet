# PAY54 Batch 48 — Transactional Revocation Serialization Evidence Contract

24 November 2026. **SOURCE ONLY, NO FINANCIAL EXECUTION OR DEPLOYMENT.**

## Threat
Batch47's fresh committed session recheck is not atomic with a subsequent financial transaction. A session can be revoked immediately after the check, allowing a time-of-check/time-of-use gap. The existing financial writer is intentionally disabled; this change must not activate it.

## Candidate transaction protocol — design, not implementation
1. In a server-authenticated financial transaction, acquire a row lock on the exact session identity, using one canonical lock order. Check token digest, active session/version, account membership, wallet scope, expiry and owner against the database **while the lock is held**.
2. Validate available-balance semantics, permissible amount, currency and durable idempotency record. Enforce all existing ledger invariants. Database function execution must use a separately approved non-superuser, NOBYPASSRLS identity; never trust a browser-supplied principal as authorisation.
3. Execute any future financial updates and outbox insertion **in the same transaction** and commit before releasing the session lock.
4. Revocation/account switching must acquire **the same session lock** before updating session state, so either revocation linearises before the financial transaction and blocks it, or financial commit linearises before revocation takes effect. Specify customer disclosure and handling of transactions already committed before logout.
5. Prove the protocol using two **real physical PostgreSQL connections**, independently verified effective roles, simulated revocation and transaction races, lock timeouts, RLS/ledger checks, idempotency/replay, full rollback and outbox atomicity.

## Source-only implementation
The offline `backend/governance/pay54-revocation-serialization-contract.mjs` validates an event-sequence evidence record and strict non-authorisation flags. It does not establish authenticity of the record or whether PostgreSQL actually performed the locks. The synthetic tests demonstrate only that malformed evidence and insecure traces are rejected by this parser. This is **not** a transaction coordinator, lock manager or financial authorization token.

## Admission blockers
- Actual disposable PG16 two-connection lock race **not implemented by this batch**
- Neither a positive least-privilege financial writer nor a transactionally session-bound ledger command is enabled or proven
- Provider-settled funds and approved customer available balance are unverified
- Cloud SQL GBP quote, operational rollback, DBA/Security approvals and staging IAM/TLS are pending
- Draft PRs #81–#87 must be reconciled before combined integration

**Staging NO-GO. Production NO-GO. Cloud spending NOT AUTHORISED.**
