# PAY54 CTO — Batch 22 Source Closure and Release Decision

**Scope:** numbered implementations 818–867 (50 founder-approved engineering actions).
**Pull request:** #10, intentionally DRAFT and stacked on unmerged Batch 21 PR #9.
**Deploy status:** NO-GO; absolutely no live PostgreSQL migration, account switch,
wallet posting, card funding, website publication or IAM grant executed.

## Engineering result

Batch 22 adds executable PostgreSQL read-only backend adapters and independent
credential reader logic, while preserving PAY54's canonical 001–013 database
migration history. New source-only migrations 014–017 establish a future
separate token-digest session read role, append-only account-context audit,
session-to-membership integrity and a second unassigned account-directory role.

New roles are NOLOGIN, NOINHERIT, NOBYPASSRLS, have no members and no ledger
or payment-table privileges. The original reader role remains denied by the
RESTRICTIVE RLS policies from migration 013. No real database credentials,
role assignment, session rebind writer or financial execution has been
provisioned.

Executable code includes:

- Parameterised, repeatable-read-only PostgreSQL account directory adapter.
- Canonical account_contexts and membership column mapping, without duplicate
  accounts table or recreated membership role logic.
- Transaction-local actor ID and credential SHA-256 digest binding.
- Actual PostgreSQL catalogue validation of a non-superuser/NOBYPASSRLS,
  SELECT-only role and FORCE RLS on accessed relations.
- Two-pool authenticated composition with the retained Batch 21 directory
  validation and session continuity controls.
- Explicit rollback and pool connection disposal for uncertain failures.
- Ordered migrations and an independently tested migration-compatibility
  guard that refuses duplicated account schemas and regranting the legacy
  denial role.

## Database regression scope

The new dedicated disposable PostgreSQL workflow applies existing
001–013 **in their canonical order**, then reviewed additive 014–017. It
executes only Batch 22's twelve SQL fixtures, not the pre-existing SQL test
suite's overlapping synthetic fixture IDs.

These fixtures check tenant A/B account RLS, business viewer membership,
token-digest session RLS, expired/revoked session denial, suspended account and
member denial, existing role/owner triggers, selected-session membership guard,
append-only audit and mutation rejection, original account-reader denial,
NOLOGIN/no-membership role isolation, zero ledger access, actor/credential GUC
reset after transaction and malformed/unknown actor denial.

The source workflow runs adapter tests, rollback/failure tests, inventory
regressions and retained Batch 20/21 account boundary/HTTP-503 tests. GitHub
Actions workflow results must be read against the exact final PR head; a pass
from an earlier commit cannot validate the closure.

## Correction record

An early draft added `pay54.accounts` and a second
`pay54.account_memberships`. Disposable PostgreSQL exposed that violation:
canonical migration 008 correctly refused to run. Those competing migrations
were removed before closure. PostgreSQL queries and RLS checks were remapped to
the original `pay54.account_contexts` schema. Separate SQL test fixture
ranges were required because the repository already has a longstanding
account/ledger isolation suite. This failure-and-remediation history remains
visible in the draft PR commits and is not concealed.

## Operational gaps and founder sign-off

**Real Personal ↔ Business account switching remains unavailable.** A
read-only session lookup is not session issuance, a rotated token or a secure
commit. A live switch requires a trusted mutable session writer with atomic
CAS/replay-fence, fresh CSRF, old credential revocation, session account change
and append-only audit in one durable transaction; an enforced active tenant
context; authorised role-aware wallet/card/payment reads; and real device QA.

**Production PostgreSQL remains unprovisioned.** All new SQL passed only in
disposable CI, not against a real staging cluster or customer database.
Independent Security/DBA approval is required before creating LOGIN
memberships, applying migrations or loading secret credentials.

**Legacy P0 risks remain:** current Pages overpacking exposure assessment,
linked-card development provider, GitHub protected deployer/OIDC/rollback,
UK–Nigeria licensed settlement partners, safeguarding/KYC/KYB, ledger
reconciliation and an incident/audit operating model.

## Final CTO decision

- The 50 numbered Batch 22 source actions have been committed for review;
  they include corrective actions and tests, not 50 customer-visible features.
- Keep draft PR #10 open, unmerged and excluded from any release.
- Maintain HTTP 503 for all unprovisioned account/context/financial endpoints.
- Never infer live tenant isolation or financial readiness from test mocks,
  a SQL role flag, CI status or source implementation counts.
- Advance operational environment provisioning only after separate Founder,
  Security, Compliance and Release acceptance.

**Release disposition:** NO-GO. Source review and exact-head CI acceptance are
separate from production approval.
