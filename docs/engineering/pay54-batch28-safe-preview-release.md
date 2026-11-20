<!-- PAY54 Batch 28 / 1207 -->
# PAY54 Batch 28 — Isolated Public Preview Release Boundary

**Status:** Buildable, source-reviewed **nonfinancial** static candidate. No deployment, Pages settings change or real financial activation has been executed.

## Purpose and risk

Existing checkout `index.html` is a historical application dashboard, not a safe marketing entrypoint. It contains demo account and KYC references and a claim of active financial compliance that is **not independently substantiated**. Existing `dashboard.html` still includes a linked-card development funding provider. Removing those working source dependencies without full application review would risk regressions.

Batch 28 therefore introduced `public-preview/index.html` and `public-preview/assets/css/preview.css`, visually independent of wallet/card scripts. It explicitly says that PAY54's website is a product preview and does not accept deposits, account applications, payments, transfers, card issuance, funds or personal financial information.

## Isolated deterministic build

```bash
node backend/release/pay54-public-preview-build.mjs /absolute/directory/that/does/not/exist
```

The builder copies **exactly two** reviewed source files into a new output directory; rejects existing destination, symlinks, hardlinks, files with unsupported content, malformed resource links, scripts/forms, external CSS and source maps; calls the existing Batch25 static artifact verifier and reports SHA-256 for both files. It does not upload an artifact, change Pages, connect to a server or deploy.

Source business-wallet/dashboard functionality remains unchanged. No credential is required and no visitor session is accepted.

## Browser and HTTP security

The HTML includes a restrictive **meta Content-Security-Policy** for script/resource blocking and a noindex directive. A meta CSP **does not provide effective `frame-ancestors` enforcement**, which is an HTTP response-header directive. Therefore Batch28 explicitly removed that directive from HTML and requires a separately reviewed deployed HTTPS **HTTP header** policy for `frame-ancestors 'none'` (or equivalent separately assessed X-Frame-Options), HSTS and other defence-in-depth measures.

GitHub Pages hosting has limits on custom response headers; a Pages-hosted deployment must not be claimed to have HTTP security headers based on HTML markup alone. If header control is required, evaluate a supported CDN/hosting architecture and independently verify actual browser responses before approving public exposure.

## Formal release acceptance

- Security independently verifies the **current** GitHub Pages settings and existing live artifact, including historical source exposure and any necessary incident containment.
- Release Manager obtains two independent source reviews, exact built SHA, artifact hashes and approved known-good rollback.
- Actual hosting supports validated HTTPS/TLS, CSP frame restrictions and response security policy; accessibility/browser smoke tests verify the static preview and links.
- Founder separately approves the marketing publication and any public-facing claims.
- Fintech/Compliance approve activation of any financial product separately after actual regulated infrastructure and safeguarding.

**Current decision:** Static candidate is suitable for **offline security review only**. No website publication approval. PAY54 production remains **NO-GO**.
