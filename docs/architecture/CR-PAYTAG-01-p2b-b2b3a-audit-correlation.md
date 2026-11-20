# CR-PAYTAG-01 — P2B-B2B3A audit-correlation integrity contract

**Status: SOURCE ONLY. Production migration NO-GO. No SQL writer, database role grant, HTTP route or financial execution.**

## Source finding and correction
Migration 022's immutable `paytag_registry_audit_append` trigger creates a database-generated, random event correlation ID. A future registration executor must **never invent a separate correlation value for the idempotency record**: it must obtain the precise immutable `CLAIMED` audit event produced by the same transaction and bind the committed registration record to that event.

Migration 024 adds:
- A globally unique audit correlation ID and at most one `CLAIMED` event per tag.
- A composite exact-claim audit uniqueness constraint.
- A generated `CLAIMED` discriminator and a deferred exact-claim foreign key from committed registration requests to the audit row, matched on correlation, registry tag, owner account, principal and event kind.
- A second deferred registry foreign key requiring the committed request's canonical alias to equal the immutable alias on the referenced tag for the identical account and principal.
- Preservation of forced RLS, absent policies and prohibited application/ledger role direct writes.

`PENDING` idempotency records have no tag reference; their FK is intentionally incomplete. `COMMITTED` records require a non-null registry tag by the existing migration 023 state check, so their deferred FK must resolve before commit. A request cannot masquerade as an activation/retirement audit or claim another principal's event.

## Future trusted SQL writer contract
Within a single SERIALIZABLE transaction:
1. Resolve and lock the exact session; verify bearer and CSRF digests, session ID/version/principal/account, expiry and revocation.
2. Lock verified PERSONAL account, PERSONAL_OWNER membership and explicit bound ACTIVE wallet.
3. Check existing account-scoped idempotency key and request digest; exact replay returns prior result; different digest fails.
4. Insert the registry row; the legacy immutable trigger creates its own `CLAIMED` audit row.
5. Read the tag's exact database-generated `CLAIMED` event; persist its correlation in the idempotency request; transition to `COMMITTED` in the same transaction.
6. A deferred FK proves that the completed request points to the matching immutable event. Any exception rolls back the entire claim.
7. Least-privileged executor with pinned search path and no public EXECUTE. Role/permission design needs separate review because existing registry tables use FORCE RLS and no policies.

No client-provided session, account, principal, wallet, correlation or audit event can act as authority. The release remains blocked until actual SQL writer, role, concurrency tests, independent security review, and regulated partner approval are complete.

## Testing
Disposable PostgreSQL 16 migrations and SQL integration must verify a valid exact-match claim, forged correlation rejection, foreign-principal rejection, uniqueness/RLS, and the existing ledger isolation and idempotency negative suites. Historical GitHub Pages P0 is still open.
