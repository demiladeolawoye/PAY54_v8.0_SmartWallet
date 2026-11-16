# PAY54 — Safe Dashboard Preview Acceptance Plan

**Implementation 521 · Founder dashboard preview request · Source-only decision record**

## What is visible now

The committed PAY54 dashboard UI already exists in the repository. Implementations from Batches 13, 14 and 15 are largely backend/governance tests, validators and release-control source files; they are committed to stacked, unmerged draft PRs. Their code is **not** automatically visible as a redesigned or upgraded dashboard screen.

The established GitHub Pages project address is:

- Project site: `https://demiladeolawoye.github.io/PAY54_v8.0_SmartWallet/`
- Dashboard candidate: `https://demiladeolawoye.github.io/PAY54_v8.0_SmartWallet/dashboard.html`

On 2026-11-16 the browsing environment could not fetch either URL. This is not proof that the site is down, nor that it is safe.

## P0 risk governing public preview

An inspected GitHub Pages build archive included internal `backend/`, `docs/` and `infrastructure/` source files. Public accessibility for those paths and the active deployment version remain unverified. The public repository itself is separate from live Pages reachability.

The Founder should not be directed to conduct real-money, KYC, identity-document or credential testing on an unverified Pages deployment. All dashboard previews must operate in synthetic-data mode, without partner API secrets, regulated financial operations, production cards or actual account data.

## Preview routes and review decision

| Route | Purpose | Present acceptance |
| --- | --- | --- |
| Existing GitHub Pages dashboard | View previously deployed frontend appearance only | Availability and security NOT VERIFIED |
| Developer-local preview from exact checked-out source | Review visual desktop/mobile presentation without publishing a public artifact | Preferred near-term preview; requires exact static dependencies and no live integrations |
| Access-controlled isolated preview environment | Share current reviewed branch UI with founder and QA | Planned; requires separate environment/deployer approval and independent P0 containment |
| Production dashboard release | Customer-facing launch | BLOCKED pending all regulatory, backend, security and operations gates |

## Minimum acceptance before an isolated preview

1. The reviewed source and exact frontend commit SHA must be recorded.
2. Only the restricted public site manifest may be staged. No repository-root publishing and no backend, docs, infrastructure, tests, source maps, credentials or backup files.
3. The generated preview artifact must pass source/target byte verification, directory and tar member inspection, content-marker screening, and linked HTML/CSS/JS dependency review.
4. Authentication is either fully disconnected from production or points to an independently approved synthetic mock environment. There shall be no real wallet balance, FX settlement, bank transfer, card issuing, customer identifier, KYC upload or money movement.
5. Test mobile-first dashboard layouts, desktop responsiveness, keyboard and screen-reader navigation, linked routes, modal controls, load performance and browser console errors.
6. Security, QA and Founder sign off a separately approved preview deployment change, with least-privilege access, rollback and automatic expiration where appropriate.

**Founder visibility:** The dashboard's existing visual design can be reviewed before PAY54 reaches production. The current source-only security implementations are engineering controls, not new live UI elements.

**Change-control boundary:** This plan does not activate preview hosting, edit GitHub Pages, merge a PR or enable production credentials. PAY54 production remains BLOCKED.
