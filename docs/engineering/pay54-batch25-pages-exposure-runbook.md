# PAY54 Batch 25 / 1009 — Active GitHub Pages Exposure Investigation and Containment

**Status:** P0 investigation open. No current publicly deployed artifact, Pages configuration or DNS/certificate binding has been independently verified. Existing website was not changed by this batch.

## Confirmed source-level facts

- The tracked repository root contains `backend`, `infrastructure`, `docs` and `.github`; **publishing this checkout directly is prohibited**.
- `dashboard.html` includes the browser-loadable `assets/js/infrastructure/payments/providers/linked-card-development.js` before the linked-card funding adapter. This is a development simulator, not licensed financial infrastructure.
- A candidate static bundle may be checked offline using `verifyPay54StaticReleaseDirectory`. It rejects source/private directories, links, non-static file types, common credential markers and source-map references; it **does not prove** all secrets are absent.
- `probePay54KnownPublicPages` performs only unauthenticated HTTPS HEAD checks against allowlisted URLs without following redirects or reading bodies. A 200 is **potential exposure**, whereas 404 is only an observation at that instant; both require an independent reviewer.

## Authorised incident evidence collection

1. Security and Release Manager jointly inspect repository **Settings → Pages** and record active source (branch/directory or GitHub Actions), live deployment identifier, exact Git SHA, custom domain, DNS/CNAME, certificate, visibility and deployment history. Read only; no automatic settings change.
2. Inventory active and historical Pages artifacts and relevant Actions run IDs. Inspect artifact filenames and sensitivity before granting anyone a copy. Do not publish raw backend, SQL, private docs, logs, credential values or customer data as evidence.
3. From a controlled, non-customer test machine, check the published root and known private paths on the verified primary domain and any validated GitHub Pages URL. Record UTC time, HTTP status, redirect chain, content type, matched file hash only when lawfully accessible, and response provenance. Do not assume that a generic HTML fallback means a private source file exists.
4. Independently compare public responses with source SHA and signed artifact hashes. If backend source, internal documents, service keys or a development financial provider were exposed, classify impact with Security/Compliance and create an incident ticket.
5. Contain exposure through a separately authorised release change: disable an unsafe publishing source, replace with a minimal reviewed static-only artifact, revoke/rotate affected secrets and invalidate caches/CDNs as required. Preserve immutable forensic evidence, approvals and recovery plan. Never delete logs merely to make tests pass.
6. Verify closure through a second independent reviewer, fresh external requests, GitHub deployment/config evidence, source boundary checks, artifact hash match and a signed containment statement.

## Strict release gate

Do not attach a deployed artifact to production without verified branch/environment controls, approved static candidate, no development card provider, signed identity/IAM review and rollback. An unverified or inaccessible URL is **NOT_VERIFIED**, not SAFE.

**Current decision:** CR-PAGES-01 OPEN, release NO-GO.