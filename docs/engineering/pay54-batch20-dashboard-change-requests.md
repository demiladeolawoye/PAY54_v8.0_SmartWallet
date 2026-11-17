# PAY54 — Batch 20 dashboard review change requests

**Status:** Founder feedback received, implementation decisions tracked.
**Scope:** Presentation-only first-paint repair and a separately gated Personal/Business account selector.

## CR-UX-03: Legacy dashboard flashes for 1–2 seconds after successful login

**Observed:** On successful login the old dashboard is visible briefly before the new PAY54 blueprint mounts.

**Source cause:** The existing blueprint adapts/rearranges old dashboard DOM nodes near the end of the dashboard script load. The previous head bootstrap tried to add a pending class synchronously, but the old screen was not guaranteed to be suppressed at markup first paint; a timeout also deliberately revealed the original dashboard if the blueprint was unavailable.

**Approved scope:** Stop the old screen being shown during the handoff, with an accessible loading status and a recoverable error. Retain all authentication, financial modules, legacy nodes required for engine compatibility, and action safety gates.

**Implemented for review:** Add pending state directly to the opening HTML element; install an early head first-paint stylesheet; display an accessible loading/error status; replace the boot controller with a verified blueprinted-DOM success gate and fail-closed retry outcome; remove competing pseudo-loading overlay. A failed mount or watchdog timeout does **not** unveil the old interactive dashboard. The existing DOM adaptation and financial engines remain unchanged. Validate in browser before merging.

## CR-ACCOUNT-02: Personal/Business account switcher missing in new dashboard

**Founder observation:** Personal account switch no longer displays in the approved dashboard.

**Verified source cause:** `assets/js/dashboard-blueprint-shell.js` unconditionally constructs a **disabled** button labelled `Personal account · Switch unavailable` and sets `accountSwitcher.disabled = true`. This is an intentional presentation placeholder, **not proof** of a working authenticated account-switching service. An older version of the UI must not be resurrected with client-only account mutation.

**CTO recommendation — pending founder approval:**
1. Provide a clear, compact active-account selector beside the profile avatar on desktop, with a touch-accessible mobile variant and a desktop sidebar context label.
2. Render only the authenticated user's authorised Personal and Business accounts; show only Personal if no eligible Business account is linked.
3. On switching, require server-authorised account context, account/tenant ownership, permission/role checks, RLS, session integrity, account-scoped cache invalidation and independently confirmed wallet/transaction/card reload; never reuse balances across tenants.
4. Until those backend contracts are independently verified, retain a truthful disabled/unavailable state **without** a fake switch or unverified Business context. Preserve the current wallet/cards/FX/ledger paths.
5. Validate Personal→Business→Personal test sequences, direct deep links, suspended/missing accounts, network errors, accessibility, browser history, and no cross-account data leakage in production-equivalent sandbox.

**Decision:** Not yet approved to change functional account switching. This change request is a proposal for founder review and security/API scope, not an implemented switch.

## Operational release constraints

The historical overbroad GitHub Pages package and the prohibited linked-card development provider are still P0 blockers; current active Pages exposure and configuration are unverified. All changes are source-only on the unmerged draft review branch; no live Pages publication, production identity changes, real-money actions or feature removal are authorised.
