# PAY54 — Founder offline dashboard preview guide

**Implementation:** 555
**Purpose:** Review the current dashboard's visual layout without exposing live banking APIs or publishing internal application source.

## Review the dashboard

The Engineering Office provides two equivalent visual-only options:

1. **Single-file HTML:** Open the `PAY54_Founder_Dashboard_Offline_Preview.html` file from the current ChatGPT conversation in Chrome, Edge, Safari or Firefox. This package embeds the visual styles and logo in one local file.
2. **Verified GitHub Actions ZIP:** Open the latest Batch 16 GitHub Actions workflow, download the seven-day `pay54-dashboard-offline-<source-sha>` artifact, extract its contents into a new folder, then open `index.html`. Keep the CSS and image folders together. The companion `preview-manifest.json` identifies the exact source commit and SHA-256 of visual files.

**Do not use the public Pages website to enter passwords or upload identity documents while P0 security review is open.**

## What the preview includes

The existing dashboard shell, headline layout, balance sections, currency controls, card and service interface, menus, typography, colour and responsive CSS. Static text is illustrative; the preview is **not** a live account statement, product acceptance or financial transaction simulator.

All source JavaScript engines are omitted from the downloadable ZIP. The output uses restrictive content-security rules: scripts, connections, forms, frames and service workers are disabled. Controls are visually present but nonfunctional.

## Founder visual review checklist

| Review | Suggested check |
| --- | --- |
| Brand | PAY54 logo, headline and One Wallet Everywhere identity |
| Mobile-first | Fit on a narrow screen without overlapping wallet and menu areas |
| Desktop | Logical columns, shortcuts, balance cards, navigation |
| Readability | Sufficient text size and contrast; clear NGN/GBP/USD currency labels |
| Money Moves | Understand the proposed Send/Receive/Add/Withdraw journeys visually, without submitting a transaction |
| Services | Cards, bills, FX and related services appear clearly separated |
| Accessibility | Labels, headings, visible disclosures and display-only controls are understandable |
| Product decisions | Record requested layout changes separately from backend money movement authorisation |

## What is not yet verified

A downloadable HTML file is not a deployed PAY54 web application. Automated source-markup checks do not certify WCAG conformance, browser focus, live accessibility or device responsive usability. No partner integration, authentication, KYC, real balance, ledger settlement, FX or card issuance is tested.

Live GitHub Pages configuration, currently published artifact, source-file reachability and actual sensitive-data disclosure remain independently unverified. The older deployment artifact was confirmed overbroad; the offline preview ZIP is a **different, restricted artifact**.

## Change requests and approvals

Founder feedback is captured in the CTO change-request register, with proposed priority, dependency, risk and implementation owner. Changes affecting live Pages publishing, credentials, IAM, partner environments, customer identity, production finance or databases require separate operational approval.

**Release state:** All offline preview artifacts remain test-only. Production stays **BLOCKED** until actual security, QA and regulated approvals are complete.
