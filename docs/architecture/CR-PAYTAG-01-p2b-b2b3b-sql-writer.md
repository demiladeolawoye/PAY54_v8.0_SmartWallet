# PAY54 CR-PAYTAG-01 — P2B-B2B3B PostgreSQL registration writer

**Source-only SQL contract. Not callable by PAY54 runtime roles. No migrations applied outside disposable CI.**

Migration 025 defines `pay54.register_paytag_trusted` with the exact signature anticipated by the reviewed JavaScript adapter. It is a SECURITY INVOKER procedure, explicitly revokes PUBLIC execution, and creates **no role, policy or execution grant**. This deliberately means the adapter cannot execute it under its required `pay54_paytag_register_role`.

The function validates and locks the exact session ID, token digest, CSRF digest, session version, principal, current active account and expiry. It locks the verified PERSONAL account, checks active PERSONAL_OWNER membership, requires exactly one currently active bound wallet (multiple active currency-wallet bindings fail closed until an explicit, independently approved wallet selection contract exists), and serializes claims via account row locking. The client can supply no wallet or audit correlation authority.

An existing idempotency key can only replay the identical committed request for the same account, session, principal, alias and digest. Otherwise it fails closed. New claims insert the immutable tag, obtain the database-generated CLAIMED event and persist a committed idempotency record bound to both deferred FKs from migration 024. Alias uniqueness, lifecycle rules and audit integrity are preserved.

**Open security acceptance before any restricted runtime role:** PostgreSQL 16 fixture with valid claim, exact replay, changed-digest rejection, stale/rotated session, bad CSRF, suspended account, inactive member/wallet, two-account alias race, same-account competing tags, direct-role privilege denial, forced RLS and commit-uncertainty simulation. Independently review SECURITY DEFINER ownership and minimal RLS policies in a separate migration; a privileged CI test cannot validate the future role. The current function does not expose or enable an API route. Public Pages P0 and real-money NO-GO remain.
