# PAY54 Batch 25 / 1010 — Linked-Card Development Provider Transition Strategy

**Confirmed source:** `dashboard.html` loads the linked-card development provider script, followed by `assets/js/engine/funding/adapters/linked-card.js`, `assets/js/services/funding.js` and card UI. The existing provider file declares a deterministic in-memory simulator with no real card networks, acquirers or money movement.

**Release decision:** Preserve the working development path for local QA. **Do not** describe it as a payment processor, enable a real-funds toggle, or publish a public financial release using this simulator.

## Replacement architecture

Keep the existing canonical Funding Constants → Funding Engine → Linked-Card Funding Adapter boundary and install an approved, separately contracted PSP/acquirer adapter behind it. Avoid duplicating capture/reversal/idempotency logic in UI code. All actual authorisation, SCA/3DS2, tokenization, captures, refunds, reversals, dispute handling and settlement must use a trusted backend and provider webhooks—not the browser-only simulator.

Before any provider can qualify for independent review, attach actual executed contracts and evidence for the ten categories enforced by `assessPay54CardProviderAcceptance`: regulatory permissions, PCI scope, SCA/3DS2, refunds/chargebacks, idempotent capture/reversal, reconciliation, safeguarding, incident SLA and negative sandbox tests.

## Zero-regression acceptance

- Freeze working development-only tests and verify current debit/card views still load in a strictly offline development environment.
- Introduce an independently approved provider abstraction with contract tests for quote expiry, currency mismatch, 3DS challenge, authorisation decline, duplicate capture, webhook replay, reversal, partial refund, funding ledger posting and orphan settlement recovery.
- For each transaction, ensure source token, principal, selected Personal/Business account, provider reference and immutable ledger instruction are reconciled server-side. Never use a front-end success callback as proof of funds.
- Cross-test on mobile/desktop, slow network, parallel tabs, invalid card state and accessibility. Mock/sandbox funds are clearly marked and never displayed as real.
- Build a reviewed static artifact excluding the development provider when (and only when) the supported production adapter, backend and legal rails are approved. If no PSP has been signed, keep funding disabled rather than silently substituting a fake success.

**Current state:** Contracted production linked-card provider NOT VERIFIED. CR-CARD-01 OPEN. No live funding activated.