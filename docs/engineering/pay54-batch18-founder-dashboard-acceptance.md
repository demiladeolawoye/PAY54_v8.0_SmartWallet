# PAY54 — Founder Dashboard Review and Release Acceptance

**Batch 18 item 663** · **Status:** Offline source review available; live release NO-GO.

## Visual review available today

The source-only GitHub Actions workflow generates an **expiring offline HTML/CSS/image artifact** from the exact Batch 18 PR head. It includes a SHA-256 manifest and excludes application JavaScript, server/backend, infrastructure and real financial data. Its content is derived from the existing PAY54 dashboard, not a separate invented design.

The user-requested blue balance card context now contains:
- Across wallets (converted) and FX wallet demo context, with device/PIN security explicitly unverified.
- Illustrative daily movement **↑ +₦24,500 today**, clearly marked sample movement not verified.
- Demo account `3001234567`, tag `@pay54-user`, and a sample unverified KYC Level 2 display.
- Financial security/compliance disclosure marked **demonstration only — not verified**.

These values are illustrative and must never be represented as genuine account credentials, settled funds, verified KYC or approved regulated financial services.

The previous synthetic Chromium screenshots at desktop **1440×1000**, tablet **768×1024** and mobile **390×844** confirmed the restored balance elements and corrected the tablet Money Moves grid. The screenshots were made at an earlier reviewed source commit, so they must be **regenerated for the exact future release SHA**. A screenshot-only visual fixture is not an authenticated customer session or a full accessibility certification.

## Required acceptance checklist before customer exposure

| Acceptance dimension | Founder / QA check | Current status |
| --- | --- | --- |
| Blue balance card | All four details visible, readable and no fixed-height clipping | Source fixed; previous synthetic review passed |
| Tablet Money Moves | Labels readable, tile wrapping, no overlap | Source fixed; previous synthetic review passed |
| Mobile | 390px viewport, no overflow and button readability | Previous synthetic review; release SHA retest required |
| Desktop | Currency menu, shortcuts, wallets, sidebar, activity and alerts | Previous synthetic review; release SHA retest required |
| Interactive flows | Authenticated sandbox login, send/receive/add/withdraw, cards and history with no real funds | Not accepted |
| Preview financial controls | Disable linked-card payments by server/backend capability or integrate authorised provider; no frontend-only hiding | Not accepted |
| Accessibility | Keyboard order, focus visible, text contrast, screen-reader navigation and disclosures | Not independently certified |
| Release security | Complete safe asset graph, restricted Pages tar, no internal source, no sensitive data | Blocked by development linked-card dependency |
| Live Pages | Actual settings and current deployed artifact/URL reachability | Not independently verified |
| Rollback | Known-safe retained artifact, exact SHA recovery and incident procedure | Not accepted |

## Founder change requests to discuss after viewing the offline dashboard

Product improvements can include simplifying primary navigation, distinguishing transaction-capable services from coming-soon features, increasing mobile balance readability, improving recent activity trust signals and reducing shortcut density. Each approved design change must retain existing working functionality and pass regression tests; no unapproved financial engine or payment provider is activated.

**CTO release decision:** The offline dashboard can be reviewed today. Do not submit real credentials or customer information. A public hosted dashboard replacement is not approved until the active Pages P0, provider decision, QA and rollback gates are resolved.
