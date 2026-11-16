# PAY54 — Balance Context Visibility Regression Fix

**Batch 17:** Implementation 577  
**Date:** 16 November 2026  
**Affected screen:** Existing PAY54 wallet dashboard, blue Active Wallet Balance card  
**State:** Implemented in source review branch, not merged, not deployed

## Reproduction and verified root cause

In the founder's GitHub Pages screenshot, the active balance amount and Add Money/Withdraw controls are present, but the following four blocks underneath the amount are missing:

1. Converted-wallet and FX/device-security context (`.balance-meta`)
2. Daily movement text (`.balance-delta`)
3. Account, tag and KYC identifiers (`.identity`)
4. Security/compliance status (`.trust-chip`)

The blocks **already existed** inside `dashboard.html`. In `assets/js/dashboard-blueprint-shell.js`, the blueprint explicitly set `hidden` on the movement row and added `p54b-conceal` to the other three. `assets/css/dashboard-blueprint-shell.css` contains a matching `display:none!important` rule. The behavior was a presentation regression, not missing backend data.

The existing `assets/js/core/preview-claims-guard.js` also correctly replaced unsupported account and compliance assertions in public development preview. The presentation fix must preserve that safeguard rather than showing fabricated verified financial/security status.

## Source remedy

| Component | Implemented behavior |
| --- | --- |
| Dashboard blueprint shell | Unhide only the four approved balance context blocks, remove their concealment classes and retain their existing DOM nodes. Optional FX ticker remains subject to its own readiness. |
| Base dashboard HTML | Retain visible demo account number, PAY54 tag and sample movement, all explicitly labelled as illustrative or unverified. |
| Preview claims guard | Protect all four blocks, replacing their content with a demo-safe claim in public development preview; do not modify storage, financial engines or customer account records. |
| Blueprint refinements CSS | Restore readable, responsive text, positive sample movement styling and a visually distinct compliance disclosure without fixed-height clipping. |
| HTML asset versions | Increment CSS, blueprint and claims-guard query versions so the next authorised deployment does not reuse older cached content. |
| Tests | Validate the source DOM, blueprint visibility policy, responsive CSS, demo-only claims guard execution and idempotence. |

## Expected source presentation in public development preview

- **Across wallets (converted)** • FX wallets enabled (demo) • Device + PIN security not verified
- **↑ +₦24,500 today** · sample movement (not verified)
- **Demo Acct: 3001234567** · **Demo Tag: @pay54-user** · **KYC: Level 2 sample (unverified)**
- **🔒 Security & financial compliance: demonstration only — not verified**

These strings describe an illustration, **not** a verified daily transaction total, account assignment, real KYC decision, secure device attestation or regulatory authorisation.

The existing read-only feed message, `Movement unavailable · Verified history required`, remains a truthful warning that historical movement has not been proved by backend source evidence.

## Explicit compatibility and validation boundaries

No changes were made to ledger, real balances, card issuance, transactions, authentication, backend APIs, tenant RLS, customer KYC, financial reconciliation or payments. The approved dashboard layout, other sections and existing service event handlers are preserved.

Source and VM-based automated regression tests must pass on the exact branch SHA. Browser rendering and responsive layout (narrow phone, tablet, desktop), focus order, actual screen-reader behavior and visual comparison with the founder screenshot remain to be checked before release.

**The live GitHub Pages dashboard will not change until a separately authorised, security-reviewed deployment.** The confirmed prior overbroad Pages packaging P0 remains open; never deploy the repository root or merge this branch to bypass that gate.
