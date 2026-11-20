# PAY54 Batch 26 / 1052 — Live Pages Evidence Collection Procedure

**Owner:** Security Engineer, assisted by protected GitHub repository administrator. **State:** evidence acquisition pending.

1. Capture authenticated repository Pages settings: source branch/directory or GitHub Actions, custom domain, visibility, configured HTTPS enforcement and current deployment ID. Record collection time, reviewer and audited commit SHA. A connector error, missing result or 403 must be recorded as **NOT_VERIFIED**, never as configuration absent.
2. Capture current Pages workflow and artifact metadata, build/release provenance, file inventory and SHA-256. Determine whether the public source actually derives from project root, `/docs` or an Actions artifact.
3. From an authorised review workstation, perform unauthenticated HTTPS HEAD checks against the actual confirmed Pages URLs. The Batch25 source probe can assist only with allowlisted candidates; do not include cookies, tokens, redirects or response bodies in automated probing.
4. Independently inspect only legally authorised public responses at source-like paths. Classify 404, redirect, 403, text/html fallback and source-content matching separately. Preserve only redacted headers, time and hash evidence in the founder register; store any sensitive body in a restricted incident store.
5. Compare public artifact provenance with signed source and expected static release bytes. Batch26's metadata, artifact and Ed25519 reviewer checks are consistency tools, not substitutes for the live GitHub API and browser evidence.
6. If sensitive source is confirmed, open a formal incident ticket, identify exposure duration, assess embedded secrets, rotate affected credentials under approved change and coordinate legal/data protection duties. Do not rewrite or delete logs.
7. For containment, approve a separate protected Pages release with an isolated static-only bundle. Keep financial UI safe until the development linked-card provider is replaced or explicitly disabled with regression-tested UX.
8. After containment, run fresh independent external checks, confirm CDN/cache invalidation, compare deployed bytes and close only with Security, Release and Founder review.

**Acceptance:** Authenticated evidence, immutable hashes, independent reviewer and rollback reference. **Current result:** CR-PAGES-01 OPEN.