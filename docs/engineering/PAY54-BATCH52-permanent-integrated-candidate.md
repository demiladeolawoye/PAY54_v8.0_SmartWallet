# PAY54 Batch 52 — Permanent, Reviewable Combined Engineering Candidate

25 November 2026. **Engineering source integration only; NOT a managed staging/production release.**

## Provenance
This branch is based on the exact reviewed PR #89 commit `22e7d22894d28dd6318710c42be3c0e196c2f596`, which descends from the protected `project-titan` baseline. All unique changed files from PRs #81–#88 were copied from their verified exact GitHub head commits, retaining the corrected versions. The only overlapping file is `.github/workflows/pay54-batch22-postgres-rls-integration.yml`, which was reconstructed using the proven Batch 51 CI recipe from PR #89, retaining test files 035/037/038 before rollback, and 036 plus financial integrity regressions after rollback; physical row-lock test 039 remains in its original position.

## Why a separate candidate
Batch 50 demonstrated that independently approved PRs cannot be combined naively: #84, #85, #86 and #89 all modify the same PostgreSQL integration workflow. Batch 51's disposable CI-only combination passed the full PG16 suite on 24 November. This new branch makes the combined *source* persistent, inspectable and independently reviewable for subsequent integration validation without merging any draft PR to `project-titan`.

## Acceptance gates
- Exact-head source and PostgreSQL 16 integration CI must pass on this candidate PR.
- Reviewers must confirm no functionality was lost during consolidation, with particular attention to the SQL execution ordering, restored ACL/RLS state and all four writers/security suites.
- All original PRs #81–#91 remain independently governed; the new candidate does not grant approval to merge them or itself.
- The historical SQL CI runs are disposable and largely superuser-operated; therefore they **do not** prove a real non-superuser positive financial writer operating after FORCE RLS.
- Prove an authenticated transactionally locked writer/revoker protocol and real concurrency, including idempotency, ledger balance, outbox atomicity, user-session validity and full rollback, before any operational release.
- Final GBP Cloud SQL quote, independent security/DBA and Finance approvals, explicit spend permission, IAM, TLS, operational rollback, partner settlement and release authorisation are outstanding.

**Source merge NOT YET AUTHORISED. Cloud spending NOT AUTHORISED. Managed staging NO-GO. Production NO-GO.**
