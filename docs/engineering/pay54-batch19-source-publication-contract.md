# PAY54 Batch 19 — Public-site dependency scanner review and release contract

**Implementation:** 713  
**Status:** Source-only development review; no GitHub Pages deployment approval  
**Owner:** Principal Security Engineer, Chief Enterprise Architect and Principal Release Manager

## Why the implementation exists

The existing PAY54 dashboard contains a development-only linked-card funding provider in a prohibited public asset directory. A historical Pages build artifact was separately confirmed to contain backend, documentation and infrastructure files. An allowlisted static candidate cannot be trusted solely because its HTML points to files that exist on disk.

Batch 19 strengthens the existing canonical HTML link audit rather than introducing a second financial application. It does not move the simulated card provider, alter funding logic or change the live website.

## Static markup and dependency controls

The canonical `pay54-static-site-link-audit.mjs` now distinguishes actual browser `src`/`href` attributes from inert `data-src`, `data-href` and `data-action` presentation metadata; it checks only active markup after ignoring HTML comments and script/style bodies. Unexpected `srcset` responsive sources, active HTML form actions, base URL rewrites, meta-refresh redirects, object/embed plugins, inline executable event attributes, unsafe schemes, encoded traversal and double-encoded residual percent escapes are rejected for manual security review. The original known forbidden linked-card script is still a missing candidate dependency and still prevents site staging.

The shared markup projection is used by both the canonical HTML auditor and the first-party dependency classifier, avoiding divergent comment and inline-code handling. This source projection is **not a complete HTML5 parser** and must not be represented as comprehensive XSS, DOM or runtime behaviour testing.

Batch 19 adds a bounded inventory of executable inline JavaScript blocks, storing SHA-256 digests rather than copying source into governance reports. It also statically examines JavaScript imports and worker references for missing local files, remote references and dynamic expressions. A regular-expression scanner is **not** a JavaScript AST or execution-path proof: import maps, programmatically constructed URLs, runtime fetches, service workers and external script bytes still need independent review.

## Exact-source release evidence

The Batch 19 source evidence binder requires one consistent 40-character reviewed commit SHA across the proposed release, offline founder preview, browser QA and staged source, and matching SHA-256 source/artifact manifests. Rollback must refer to a distinct retained source and independently reviewed archive.

The public-path evidence reviewer differentiates a HEAD response, a sampled 404, a GET with no content digest and content bytes matched to a recorded SHA. These **operator-supplied records are not a direct authenticated observation of the active GitHub Pages deployment** and never prove exposure or absence of exposure on their own.

Dedicated read-only Actions CI runs Batch 19 security tests and the retained CTO scorecard regression. It generates a **seven-day inert offline founder dashboard package** using the existing preview builder and independent SHA-256 verification. No original application JavaScript, customer account secrets or financial execution functionality are included; it is not a public Pages deployment.

## Required release follow-up

| Priority | Outstanding acceptance | Owner |
| --- | --- | --- |
| P0 | Actual signed-in GitHub Pages source/deployment, protected environment, current artifact contents, public reachability | Founder + Security + DevSecOps |
| P0 | Specific linked-card production partner or explicitly approved server-gated disabled-preview capability; no silent simulator relocation | Fintech Architect + Founder + Security |
| P0 | Rebuild complete restricted website artifact with no forbidden source paths and independently attested tar bytes | Release Manager + DevSecOps |
| P1 | Exact-release desktop/tablet/mobile and authenticated sandbox journeys, keyboard and screen-reader QA | QA + Frontend + Security |
| P1 | Known-good retained rollback with protected deployer evidence and rehearsal | Release Manager |
| P1 | UK–Nigeria partner contracts, KYC/AML, safeguarding, settlement, fraud and ledger reconciliation | Compliance + Backend + Fintech |

**Decision:** Source work may proceed, but customer Pages release and real-money activation remain **NO-GO**. No GitHub settings, secrets, live deployment, database grants, account records or payment engines were changed.
