# CR-PAYTAG-01 P2B-B2A — Durable Registration Idempotency Foundation

**Source-only / not deployed / no database role grants / no PayTag claims or transfers**

Migration 023 introduces a digest-only registration idempotency record with a lifetime unique key per authenticated account and a unique correlation ID. A committed record must reference a canonical registry tag. A trigger makes owner, principal, session, alias, digest, correlation and creation identity immutable, and permits only a PENDING → COMMITTED transition with a referenced tag.

The idempotency key digest is not an authentication secret. Client requests never supply account, principal, wallet or session authority. A future server-only transaction executor must extract the credential itself, enforce origin/CSRF, lock the active session and verified PERSONAL account, recheck wallet ownership, atomically insert the idempotency claim, reserve the canonical alias, and commit its lifecycle audit alongside the idempotency result under bounded retries. It must reject the same key with different request digest and never replay an operation to another account.

FORCE RLS remains enabled, with no policies or application role grants; therefore **this migration cannot be used by customers and cannot register tags**.

Release prerequisites: negative replay/same-key conflicts, two-session concurrency, stale session and account-switch races, least-privileged PostgreSQL executor identity (no superuser/BYPASSRLS), persistent audit linkage, contract/security review, deployment rollback testing and separate regulated-operations approval. No production migration or public page deployment; historical Pages exposure P0 remains unresolved.
