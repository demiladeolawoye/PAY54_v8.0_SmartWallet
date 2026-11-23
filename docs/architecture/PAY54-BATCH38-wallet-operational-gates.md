# PAY54 Batch 38 — Restricted wallet-read migration review and operational staging gates

**Base:** protected `project-titan`, PR #77 merge `bd2c5422f4a8a049d45eca6be61af2791d555dfc`.

## Delivered, source only

- `backend/db/release/wallet-read-v1-forward-review.sql`: transactionally adds a dedicated SECURITY DEFINER restricted accounting-reader function using canonical non-login owner/caller, narrowly scoped actor/wallet RLS policies, owner SELECT privileges and caller EXECUTE only. It additionally enforces READ ONLY transaction isolation on execution. This is a *candidate for independent DBA/security review*, **not an approved or scheduled production migration**.
- `backend/db/release/wallet-read-v1-rollback-review.sql`: transactionally revokes the function, removes its policies/grants and restores financial-table RLS flags to the restricted baseline required by the forward preflight. It does not remove shared inert roles or modify unrelated identity RLS policies.
- `033_wallet_forward_rollback_disposable.sql`: disposable PG16 synthetic account, an isolated LOGIN role with NOINHERIT/NOBYPASSRLS and explicit membership in the existing non-login caller, SQL session role assumption, direct table-read denial, actual READ ONLY restricted balance invocation and wrong-wallet denial. A disposable LOGIN without password is **not real workload authentication**. The full workflow runs forward, tests, reverse and a post-rollback ACL check.
- `fresh-committed-session-fence.mjs`: a distinct checked-out PostgreSQL session with READ COMMITTED READ ONLY and canonical RLS-posture verification. The authenticated accounting bridge now **requires** this second committed-state verification following the restricted accounting result; stale, revoked, rotated, switched or wrong-principal sessions fail closed. This is not an atomic proof of a revocation racing *after* the fence.
- Updated backend adapter refers to the independently reviewable `pay54.wallet_read_restricted_v1` function; the original disposable Batch 35 proof is preserved.

## Critical enterprise release concerns

1. **Financial writer interaction:** the migration candidate adds FORCE ROW LEVEL SECURITY on financial tables that previously did not have RLS enabled. This global change may impact existing posting, reversal, reservation or third-party integration paths, even if the restricted reader itself is sound. Do **not** approve staging application before proving all existing ledger execution roles and SECURITY DEFINER procedures still preserve their original semantics, triggers, grants and financial invariants on the *post-migration* schema. Testing and rollback are prerequisites, not approval of the policy design.
2. **Credential identity:** SQL `SET SESSION AUTHORIZATION` under disposable superuser proves database-role switching and privileges, not actual managed PostgreSQL LOGIN, GCP IAM, network TLS or credential custody. Independently inventory service principals, Secret Manager metadata, rotation, database `verify-full` CA/hostname, connection pool resets and privileged role grants.
3. **Revocation consistency:** a fresh READ COMMITTED transaction detects revocations committed before that new statement. A revocation committed immediately *after* it can still race a response. An explicit serialisation/consistency contract, tested against the actual physical restricted-read login, remains required. Avoid claiming linearizable revocation from a post-read check alone.
4. **Funds integrity:** no accounting calculation is a spendable customer balance until regulated partners, settled vs pending funds, liability sign conventions, chargebacks, refunds, fees, FX, disputed amounts, HELD/reserved transfers and reconciliation controls are contractually and operationally proven. Existing returned `postedMinor` and `heldMinor` are still forbidden for customer display.
5. **API:** the HTTP handler remains unmounted. Enabling requires trusted session resolver and pool credentials, standardised HTTPS origin/host policy, request limits, audit and transport security. Mocked identity and a fabricated `rlsVerified` field do not establish real financial authority.
6. **Mobile/UI:** real iOS/Android and desktop responsive testing, keyboard, VoiceOver/TalkBack, WCAG, empty/loading/error/account switch and offline states require an actual authorised staging deployment. Existing browser/source unit tests do not replace that evidence.
7. **Rollback:** a rollback must be rehearsed in a clean disposable clone of the **target staging baseline** and signed by DBA and Security, with immutable hashes and protection against overlapping RLS changes. Application feature flag off, active-read drain, pool reset, migration rollback, positive ledger regression and post-rollback denial must be verified in sequence.

## Approval matrix

| Gate | Required witness | Present status |
| --- | --- | --- |
| Forward and rollback SQL | DBA + Security peer review, signed diff and full baseline replay | SOURCE CANDIDATE |
| Restricted identity/TLS | Verified managed LOGIN, IAM and real PostgreSQL TLS | NOT VERIFIED |
| Fresh revocation | Real concurrent revocation/response serialisation | PARTIAL SOURCE CONTRACT |
| Accounting availability | Processor settlement proof, formal finance signoff | NOT VERIFIED |
| Live authenticated wallet API | Strict real account/session/ledger binding | NOT CONNECTED |
| Responsive accessibility acceptance | Genuine iOS/Android/desktop devices | NOT VERIFIED |
| Operational staging | Named owner, access inventory, monitoring, incident and rollback signoff | NOT AUTHORISED |

**Decision: staging NO-GO, production NO-GO, no real-money operations.** PR merge authorises source integration only.
