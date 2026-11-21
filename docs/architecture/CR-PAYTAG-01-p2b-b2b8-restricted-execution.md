# PAY54 CR-PAYTAG-01 / PR #60 — Restricted PostgreSQL execution boundary

## Security scope
PR #59 merged at `62dfb28793c6900b5abbd1c3471bd17115711fa4`. This source-only migration 028 and disposable test 023 introduce a *non-login* restricted callable identity, distinct from a *non-login* SECURITY DEFINER function owner. There is no application credential, role membership, endpoint or production deployment.

## Role and privilege model
- `pay54_paytag_register_role` receives schema USAGE and only EXECUTE on `pay54.register_paytag_restricted(...)`; it has no direct table SELECT, INSERT, UPDATE or DELETE, nor EXECUTE on `register_paytag_trusted(...)` or financial functions.
- `pay54_paytag_function_owner_role` receives only the SQL operations required to run the inner transactional writer and its registry/audit triggers. It owns only the restricted wrapper, never account/wallet tables or financial ledger functions. It is NOLOGIN, NOINHERIT and NOBYPASSRLS, with no role memberships.
- The restricted wrapper has `SECURITY DEFINER`, fixed `search_path = pg_catalog,pay54,pg_temp`, requires SERIALIZABLE isolation, and executes the existing SECURITY INVOKER writer. The writer rechecks locked session/token/CSRF/version/principal/current-account, verified personal ownership, active membership, and unique eligible wallet binding in the same transaction.
- Existing FORCE RLS remains enabled for account, membership, bindings, session, registry, audit and idempotency tables. Named policies for the owner permit only needed row/command access, with status predicates for sessions, accounts and memberships. The role's RLS visibility is defence-in-depth, not the sole basis of authorisation. The writer performs exact account-scoped checks and immutable audit linkage.
- **Canonical financial wallets are not converted to FORCE RLS in this PR** because the financial ledger has separate access invariants and such a change could break existing working operations. Owner-only wallet SELECT is guarded by active status and the writer's locked account/wallet verification. Full wallet RLS integration is a separate architecture gate.

## Security assessment limitations
Even though the function owner cannot log in, it has privileged access to sensitive tables to run trigger chains. The owner must never be provisioned as a session identity, made a member of an application role or granted schema CREATE. Only trusted backend infrastructure may assume the callable identity after a separately reviewed provisioning plan. PostgreSQL SECURITY DEFINER and status-filtered RLS by themselves do not authenticate a remote customer. Server-side HMAC request binding, secret lifetime, replay controls and endpoint/connection security must be assessed independently before activation.

A successful disposable CI test proves behaviour only for its tested transaction and fixture. It cannot establish production readiness, complete cross-account concurrent correctness or after-commit uncertainty. Two-connection same-alias/different-account and revocation-in-flight tests under the **actual restricted role** remain required before runtime enablement.

## Disposable CI acceptance
Run migrations 001–027, original suite 001–022, then 028 and 023 in ephemeral PG16. Test 023 performs actual `SET LOCAL ROLE pay54_paytag_register_role` and verifies direct-table denial, a valid atomic claim, exact idempotent replay, bad CSRF/actor rejection, immutable CLAIMED audit correlation, revoked session rejection and isolation-level rejection, all in ROLLBACK transactions.

## Hold points
**Do not deploy migration 028 to any production or persistent staging database.** It changes SQL privileges and creates a callable interface and must be subjected to independent DB/security review. No LOGIN, membership or backend route is created. No customer-facing PayTag, ledger transfer, card, FX, merchant, Pages publication or real-money function is enabled. PAY54 production remains NO-GO.
