# PAY54 CTO — Batch 19 Closure and Founder Release Gate

**Scope:** Implementations 668–717 (50 individually auditable source deliverables)
**Target branch:** `cto/batch19-public-preview-safety-668-717`
**Pull request:** Draft PR #7 stacked on draft PR #6, #5, #4, #3, #2, #1
**Current release decision:** **NO-GO for public deployment and real money**

## Delivered engineering capabilities

Batch 19 corrects and extends the *existing* restricted publication governance. The static site link scanner no longer interprets inert UI `data-src`/`data-href` fields as live resources, but still rejects unsafe active paths. It additionally requires review for responsive `srcset`, HTML form targets, document base URL rewriting, meta-refresh redirects, object/embed resources, executable inline event attributes and double-encoded traversal.

A shared HTML markup projection keeps comments and inline script/style bodies from being misread as active URL attributes. This canonical helper is used by the existing HTML dependency classifier and static link auditor; existing financial business logic was not duplicated or modified.

Executable inline scripts are now inventoried with SHA-256 digests and source-runtime flags. A bounded static JavaScript module/worker dependency auditor identifies literal missing, bare and remote imports, and dynamic expressions requiring independent review. These scanners are deliberately conservative source heuristics; they are **not** a full HTML parser, JavaScript AST, client-side XSS proof or live provider integration.

Exact release evidence now requires matching source SHAs across founder preview, browser QA, staging and proposed deployment; matching SHA-256 restricted-source and Pages artifact manifests; and a separately retained rollback source. A public-path evidence reviewer prevents HEAD-only 200, 404 or GET without verified content bytes from being represented as full site proof.

The Batch 19 source-only workflow runs negative/regression tests and generates a seven-day, inert founder dashboard HTML/CSS/image artifact from the exact PR head, with independent SHA-256 verification. The artifact is downloadable through GitHub Actions; it does **not** publish GitHub Pages or enable payment engines.

## Full 50-item implementation ledger

| ID range | Completed source engineering |
| --- | --- |
| 668–670 | Exact release identity binder, adversarial source/rollback SHA tests, read-only Batch 19 CI |
| 671–672 | Bounded public HTTP path evidence classifier and HEAD/GET/404 negative tests |
| 673–675 | Correct `data-src`/`data-href` false positives and regex escaping; negative tests |
| 676–679 | Refuse unaudited responsive `srcset`, preserve root-page matcher and verify via tests |
| 680–681 | Require independent active form action review, preserving inert `data-action` |
| 682–683 | Document base and meta refresh redirect refusal, adversarial tests |
| 684–685 | Double-encoded URL traversal guard and test coverage |
| 686–687 | Object/embed active resource refusal and test coverage |
| 688–689 | Hashed inline executable script inventory and tests |
| 690–691 | Integrate inline script evidence into existing CTO scorecard and tests |
| 692–693 | Re-trigger dedicated security CI when canonical source scanner changes; workflow permissions tests |
| 694–695 | Inline event handler review requirement and inert attribute tests |
| 696–697 | Exclude script/style/comment text from actual HTML URL audit and test |
| 698–701 | Shared canonical HTML markup projection, tests and both dependency scanners rewired |
| 702–704 | First-party and inline-script comment regression tests and fixes |
| 705–708 | Static JS module/worker import review, tests, existing CTO scorecard integration and regression |
| 709–710 | Seven-day SHA-bound inert founder preview in CI and governance tests |
| 711–712 | Extend release NO-GO to inline code and dynamic JS graph review, tests |
| 713–714 | Publication scanner limitations, release acceptance and founder evidence guide, tests |
| 715–717 | Founder CTO closure report, closure truth tests and final 50-item task board reconciliation |

## Existing critical P0 findings

The historical GitHub Pages artifact `14252395793` was observed to contain 348 backend source files, 150 documentation files and one infrastructure source file. This proves **overbroad artifact packaging**, not actual currently accessible public content or a confirmed breach. The current Pages Settings, active deployment artifact, public internal-path reachability, actual data sensitivity and protected deployer have not been independently established.

The dashboard still references `assets/js/infrastructure/payments/providers/linked-card-development.js`. This is a development card-funding simulator under a prohibited public path. It must **not** be relocated into permitted assets just to circumvent site policy. Any publication decision needs a contracted production provider or a separately approved preview-only capability profile with server-side linked-card funding disabled and other functionality tested.

## Outstanding priorities and change requests

| Priority | Change request | Owner | Status |
| --- | --- | --- | --- |
| P0 | CR-PAGES-01: read-only inspection of active Pages source, deployment and actual content exposure | Founder + Security | OPEN |
| P0 | CR-CARD-01: production provider or verified server-gated public-preview feature suspension | Fintech Architect + Founder | OPEN |
| P0 | CR-DEPLOY-01: complete restricted site bytes, exact tar attestation, protected OIDC deployer and approval | DevSecOps + Release | OPEN |
| P1 | CR-ROLLBACK-01: safe retained rollback, rehearsal and audit trail | Release Manager | OPEN |
| P1 | CR-UX-01: release-SHA-specific desktop/tablet/mobile, keyboard and screen-reader dashboard acceptance | Frontend + QA | OPEN |
| P1 | CR-AUTH-01: authenticated consumer/business and tenant RLS sandbox integration | Backend + Security | OPEN |
| P1 | CR-FINTECH-01: UK–Nigeria partners, safeguarding, KYC/AML, ledger and settlement obligations | Compliance + Fintech | OPEN |

The existing balance-card fix and tablet Money Moves improvements remain available in the source review stack. They are **not yet live**. Previous synthetic Chrome screenshots and CI do not replace the final release's authenticated sandbox acceptance.

## Engineering and approval boundary

**50/50 source implementations** is not proof of production readiness. The exact final Batch 19 commit and its complete GitHub Actions conclusions must be reconciled after the task board closes. An earlier successful run does not certify a later SHA. No draft PR was merged, and no live GitHub Pages settings, credentials, cloud permissions, customer databases, payment provider, card funding, ledger balances or financial execution mode were changed.

**Next proposed batch:** 20 (Implementations 718–767) requires renewed founder approval. A public release requires separate Founder, Principal Security Engineer and Release Manager change-control authorisation regardless of CI results.

**CTO decision:** Maintain **NO-GO** until the active Pages P0, linked-card production boundary, protected deployer, rollback and authenticated UX/financial safety gates are independently accepted.
