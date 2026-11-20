# CR-PAYTAG-01 — P2B-A Registry Lifecycle Integrity
Status: **Source-only; no customer registration; no public lookup; no deployment approval**

Migration 022 introduces database-enforced invariants for PayTag registry identity, membership, monotonic registry versions, allowed RESERVED → ACTIVE/RETIRED → terminal RETIRED lifecycle, durable audit entry generation, and deletion denial.

It rechecks the verified active Personal account, active Personal-owner membership and matching wallet ownership during each write. Permanent global alias uniqueness and one-current-alias-per-account remain enforced by migration 021. It does not accept client-supplied identity as proof of authentication.

**Important limitation:** FORCE RLS still has no policies or app grants. Consequently there is **no authorised registry writer** and no active registration functionality. Future P2B-B work must provide a separately reviewed and tested trusted identity/session transaction executor, auditing correlation linkage, idempotency, account-lock ordering and race/replay handling. The append-only audit relation records successful state transitions, not rejected unauthorised attempts; those require separate security telemetry.

No production migration or real-money use is authorised. Disposable PostgreSQL integration and negative RLS tests are mandatory before any migration/release approval. Historical GitHub Pages exposure P0 remains open.
