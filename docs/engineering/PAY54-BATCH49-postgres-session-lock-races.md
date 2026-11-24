# PAY54 Batch 49 — Physical PostgreSQL Session-Revocation Race Proof

24 November 2026. **Disposable PostgreSQL 16 ONLY. No managed Cloud SQL, production credentials or financial execution.**

## Executable test
`backend/db/tests/batch22/039_session_revocation_rowlock_race.sh` extends the canonical Batch22 disposable PostgreSQL integration workflow. The test rejects any invocation without `POSTGRES_CONTAINER`, `PAY54_ENVIRONMENT=DISPOSABLE_CI` and `PAY54_FINANCIAL_EXECUTION=false`. It also confirms the expected database identity and forced-RLS session schema. It uses synthetic accounts, session identities and fixed test-only digests, never production data.

**Race A (session check wins):** one physical connection locks an active session using `SELECT FOR UPDATE`, while a separate connection attempts revocation. The test observes a genuine PostgreSQL lock wait and then requires both commits.

**Race B (revocation wins):** one connection updates the same kind of session row and holds its lock; a second connection performs a READ COMMITTED active-session `SELECT FOR UPDATE`, must be observed blocked and, after revocation commits, must find zero active rows. An independent final query checks the two sessions were revoked and versions incremented.

## Limits
This is a genuine row-lock ordering test, **not** a live authenticated financial-command barrier. Disposable tests run as the database migration superuser; they do not establish least-privilege permissioning or payment authorisation. Neither existing `SECURITY INVOKER` money procedures nor production session revokers use this new protocol. Future changes require independently reviewed atomic identity + session lock + journal/outbox transaction semantics, tested with exact restricted roles. Avoid claiming that an earlier session check can safely authorise later money movement.

No staging or production provisioning, paid resource, provider transfer or customer-visible balance activation. **Staging NO-GO; production NO-GO; spending NOT AUTHORISED.**
