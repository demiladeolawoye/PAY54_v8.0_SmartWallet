# PAY54 CTO — Batch 25 Engineering Source Closure and Release Decision

**Batch:** 25, implementations 968–1017 (50 numbered engineering actions)
**Review branch:** `cto/batch25-operational-release-gates-968-1017`
**Pull request:** Draft #13 stacked on unmerged Draft #12
**Completion statement:** 50 source actions committed; final exact-head CI must be verified separately.
**Release decision:** Production NO-GO. No existing working PAY54 website, cards, wallet or ledger functionality was deliberately changed.

## Source deliverables

- Source-root Git tree inspection and offline static candidate verifier detect private backend/infra/docs, unsafe file types, hard/symbolic links, secret markers and sourcemap references; source-level publication is blocked.
- A conservative read-only HTTPS HEAD probe is available for authorised operator investigation of presumed PAY54 Pages endpoints. Not run by CI; a 404 or unreachable URL is never considered proof that Pages is safe.
- Verified from current repository HTML that `dashboard.html` loads `linked-card-development.js` before the adapter and funding service. A release boundary refuses public financial promotion while this simulator remains in that source. No removal was attempted without approved PSP replacement and zero-regression testing.
- A read-only GitHub workflow publisher/cloud-auth inventory and deterministic founder P0 blocker register keep unknown live GitHub controls marked unverified.
- A fourth separate staging PostgreSQL bootstrap issuer pool configuration and read-only effective-role probe extend Batch 23's three-role contract. Source does not create logins, grant IAM, connect to a real DB or issue a customer session.
- Refactored the **existing** canonical migration drift verifier so earlier 001–018 callers remain supported and independently reviewed 001–020 fingerprints can now be checked without duplicating SHA256 logic.
- Four-role, twenty-migration evidence composition and controlled staging role-grant plan reject reused logins, table/ledger permissions and privileged function-owner memberships.
- Provider-side completion screens require independent evidence for replacing the development linked-card adapter and for four distinct UK→Nigeria payment rail roles (including two Nigeria payout routes). They do not certify licensing, customer safeguarding or payment readiness.
- Source-only deployment-review integrity checks require the draft PR exact head, while future Pages static candidates remain separately hash-verified and require independent approval.
- Founder runbooks now cover current Pages investigation, card infrastructure replacement, real IdP and four-role database provisioning, regulated partner due diligence, protected GitHub deployer/OIDC, rollback, device QA and performance acceptance.

## Regression and failure history

An early Batch 25 CI run surfaced incorrect literal escaping in the static credential scan and an Actions-YAML heuristic that missed `- uses:` steps. Corrected source and regression tests are committed as actions 983 and 984. These corrective actions are counted as engineering work—not as new product features.

The dedicated Batch 25 CI performs Node source/security tests, actual Git-tracked root inspection and retained Batch 23/24 identity/session/HTTP fail-closed regressions with no cloud login or financial execution. Its **final exact-source commit result must be checked after this closure document is added**; passes on older or cancelled commits do not validate the closure.

## Explicit residual risk and release controls

1. CR-PAGES-01 — actual GitHub Pages source, public artifact and historic exposure remain UNVERIFIED. The repository root is demonstrably an unsafe public artifact.
2. CR-CARD-01 — the existing dashboard loads a development linked-card provider; **do not promote as production card funding** without a contracted PSP and preserved working funding regression.
3. CR-IDENTITY-01 and CR-DB-01 — no actual IdP, user MFA/reauth, four restricted database logins, staged PostgreSQL migration or authenticated account endpoints are operational.
4. CR-DEPLOY-01 — branch rulesets, effective cloud IAM, OIDC deployment identity, protected environments and tested rollback lack independent acceptance evidence.
5. CR-FINTECH-01 — regulated UK–Nigeria partners, customer funds safeguarding, AML/KYC/KYB, FX/settlement and local payout redundancy are not licensed/contractually accepted in this source cycle.
6. CR-QA-01 and CR-OBS-01 — real device/account-cache isolation, perf, durable incident/audit monitoring and operational recovery drills are outstanding.

## Formal CTO release recommendation

- Keep Draft PR #13 **DRAFT / UNMERGED** for review.
- Reconcile all exact-head workflow results before accepting source regression.
- Do not modify active Pages settings or issue cloud credentials as part of source-only CI.
- Do not enable `/v1/accounts`, `/v1/account-context/*`, bootstrap authentication, card funding, wallet/ledger execution or any partner settlement.
- Require separate Founder/Security/DBA/Compliance/Release approval and real staging evidence for any operational change.

**Accounting:** 50 numbered engineering actions have been committed as code, tests, fixes and runbooks; **not 50 live application features**.

**Disposition:** source-cycle completion pending final CI verification; real platform staging activation and production remain NO-GO.
