# PAY54 Acceleration Wave 10 — Tenant Scope Policy Shadow and Controlled Source Integration

27 November 2026 | Security-gated | Source only | No financial activation

## Verified origin

Wave9 PR #106: independent `milade2705` approval, 2 green workflows, draft/unmerged, exact head `d2ca198f03f41bae47478dc7193da9e9d2f190ed`. A direct GitHub comparison of this head against protected `project-titan` returned **ahead 136 commits, behind 0 commits, changed files 106**. These numbers are baseline measures **before** Wave10 additions. The cumulative branch must not be blindly merged.

## Wave10 implementation

- `writer-rls-v2-tenant-shadow-forward.sql` adds five REVIEW-ONLY SELECT policies on canonical `wallets`, `ledger_accounts`, `ledger_entries`, `ledger_journals` and `balance_reservations`. These explicitly express account membership, verified personal ownership, canonical active non-revoked session and wallet/ledger foreign-key correlation.
- **Every new policy contains an unconditional `false AND` guard.** Wave9's five restrictive denial policies remain active. No role obtains SELECT, INSERT, UPDATE, DELETE, EXECUTE, schema privileges or LOGIN. The candidate does not authorize any customer access or finance execution.
- The policy predicates reference a custom context setting `pay54.w10_token` **only as untrusted design input**. Such settings can be spoofed and MUST NOT be used as the authoritative identity source in production. Actual authorised policies must consume an independently authenticated, non-forgeable, in-transaction assertion protected from caller tampering, and be tested under real role restrictions.
- `batch63/001_tenant_shadow_role_denial.sql` switches to the actual Wave9 non-superuser candidate owner and deliberately spoofs the user-settable token value, proving wallet, entries, holds and canonical financial EXECUTE remain denied by the database.
- `writer-rls-v2-tenant-shadow-rollback.sql` drops only Wave10 policies. It reasserts Wave9 RESTRICTIVE denials, original Wallet38 protected read function and all five FORCE RLS tables. The existing Wave9 and Wallet38 rollback scripts remain independent.
- The Wave10 physical PG16 source CI exercises forward → forged-context effective role denial → rollback after the Wave8 real posting vs revocation tests.

## Separate controlled cumulative source integration decision

1. Preserve the original 136-commit/106-file baseline comparison and verify fresh branch diffs from protected `project-titan` for the exact Wave10 candidate head.
2. Review every changed file group: DB migration/rollback, CI, application service/wallet read, security, docs. Identify duplicate or obsolete workflows and branch ancestry differences.
3. Run complete protected checks on the **cumulative** candidate head, not only small stacked PR diffs. Independent Security, DBA, QA and Release review must be evidenced; an ordinary approving GitHub review alone does not substitute for specialist DBA authorisation.
4. Only after explicit source-merger authorisation may a release integrator move the reviewed changes into protected `project-titan`, with rollback and regression plan. Source merge is distinct from environment deployment or financial activation.
5. Maintain an open change register for FIN-01 real non-forgeable transaction authority; FIN-02 positive multi-tenant RLS writer; FIN-03 cross-tenant, overspend, reverse-order revoke; SRC-01 backlog integration; UI-01 dashboard actual mount and UAT; CLOUD-01 final GBP quote and budget; RAILS-01 regulated UK–Nigeria settlement and KYC/AML certification.

## Acceptance vs blockers

| Scope | Status |
|---|---|
| Tenant ownership predicates | Review-only, guarded FALSE |
| Genuine non-superuser denial | Full disposable PG16 test required |
| Wave10 rollback and wallet-reader compatibility | Full disposable PG16 test required |
| Genuine positive tenant-scoped writer | **NOT IMPLEMENTED** |
| Non-forgeable DB-authenticated principal | **NOT IMPLEMENTED** |
| Cumulative protected branch source integration | **NOT AUTHORISED** |
| Managed staging, production or cloud spending | **NO-GO** |

No hard-coded Wave7 fixture policies or GUC-trusted permissions may be promoted to staging or production. Customer money stays disabled.
