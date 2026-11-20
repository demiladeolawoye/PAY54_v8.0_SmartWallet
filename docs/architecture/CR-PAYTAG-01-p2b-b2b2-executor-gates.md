# CR-PAYTAG-01 — P2B-B2B2 Restricted PostgreSQL Registration Adapter

**Source-only. No SQL writer created or installed. No credentials, policy grants, HTTP routing, customer registration or production activation.**

Based on protected baseline PR #51 merge. The adapter uses PAY54's trusted session admission and cryptographic request binding before entering a short SERIALIZABLE transaction. It rejects any connection other than the planned dedicated `pay54_paytag_register_role`, rejects superuser/BYPASSRLS and all direct registry/audit/idempotency/session/ledger DML, and requires the precise `pay54.register_paytag_trusted` function signature to be executable. The function does not currently exist. Missing function therefore causes fail-closed rollback.

The future independent SQL writer and role provisioning must, in the *same* SERIALIZABLE transaction, lock and verify auth_sessions token and CSRF digests, exact session ID/version and expiry, current verified PERSONAL account, active personal membership, legal owner and bound wallet. It must atomically claim globally immutable alias in paytag_registry, arbitrate the account-scoped idempotency key and request hash, commit request record and registry lifecycle audit, and ensure all corresponding correlation identities agree. It must reject changed tag/owner/session/version replays and account-switch races. Temporary role must have no direct table privileges, and any SECURITY DEFINER function must have pinned search_path, constrained ownership and NO PUBLIC EXECUTE.

Before any activation: disposable PostgreSQL integration against exact reviewed function, concurrent claims with distinct keys and same key, forced-RLS role tests, session-rotation race, CSRF mismatch, eligibility revocation, commit-uncertainty recovery, independent security signoff and founder production GO. Historical Pages P0 remains open.

This adapter has **no customer-facing endpoint** and makes **no financial movement**. A role-only mock success is NOT evidence that the missing SQL writer is correct or deployable.
