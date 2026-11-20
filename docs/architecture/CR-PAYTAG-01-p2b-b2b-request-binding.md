# CR-PAYTAG-01 P2B-B2B1 — Trusted Request Binding
Status: **Source-only. No registrations, RLS grants, role provision, endpoints or financial execution.**

This component binds an externally authenticated P2B-B1 admission snapshot to a strict same-origin request, 256-bit bearer credential, 256-bit CSRF value and 256-bit idempotency key. Server-side HMAC-SHA256 derives an account-scoped idempotency key digest; SHA-256 derives the request digest, bearer and CSRF digests. The snapshot is strictly non-authorising and its fields must be revalidated against the authoritative database inside the registration transaction.

## Security dependencies and scope
- The existing PAY54 session resolver remains the only source of authenticated principal and active account. The returned snapshot must not be accepted from a client or reconstructed from JSON.
- The trusted application origin and HMAC key must be provided by secure backend configuration; never trust a request's Host header.
- The database must verify the stored auth-session token and CSRF digests under lock and reject stale session versions/account switches.
- The DB unique key per account, one-active-tag-per-account and immutable alias constraints remain the definitive conflict gates.
- Rate limiting, retry policy, dedicated NOBYPASSRLS execute-only PostgreSQL role, restricted SECURITY DEFINER function, atomic idempotency/registry/audit commit and disputed commit recovery remain the next independently reviewed stages.

No PostgreSQL function call, transaction, DML, production activation or HTTP route is performed by this module. No production release is authorised. Historical Pages P0 remains open.
