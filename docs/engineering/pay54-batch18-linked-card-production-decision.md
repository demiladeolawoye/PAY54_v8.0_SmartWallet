# PAY54 — Linked-Card Funding Production Boundary Decision

**Batch 18 item 659** · **Decision state:** Provider/feature disposition OPEN · **Source-only**
**Reviewed current branch:** `cto/batch18-linked-card-preview-boundary-618-667`

## Existing architecture and verified source dependency

The PAY54 dashboard currently loads the development funding provider from:

`assets/js/infrastructure/payments/providers/linked-card-development.js`

The linked-card adapter resides at:

`assets/js/engine/funding/adapters/linked-card.js`

The funding service resides at:

`assets/js/services/funding.js`

The adapter contract requires an authorised provider exposing `getHealth`, `quote`, `authorize`, `commit` and `reverse`. It refuses missing providers, prevents direct card-balance mutation, requires authorised and correlated commits, and prohibits raw PAN, CVV, PIN and OTP handling. These are source-level controls, not proof of a production provider.

The historical linked-card development provider is a simulator, **not** a contracted real-money payment processor. The restricted public manifest correctly excludes `infrastructure/`, so the current HTML dependency graph is incomplete for safe Pages publication. Moving the simulator into another allowed directory solely to pass the scanner would bypass the intended security boundary and is forbidden.

## Alternative A — approved production card-funding partner

Keep the adapter interface and use a reviewed, contracted backend provider integration. Production must independently verify:
- Provider identity, contracts, liability, acquirer/issuer role and territory/currency eligibility.
- Server-side payment initiation, SCA/3DS where applicable, provider idempotency and signed webhook/event validation.
- Tokenised card references, PCI scope, anti-fraud, velocity limits, chargeback/refund/reversal handling.
- Ledger postings only after independently verified provider settlement/authorisation as required by product design, and double-entry reconciliation and audit.
- Safe secret storage on server only, complete end-to-end test environments, failure injection, outage and rollback.
- Funding engine contract compatibility, authenticated account isolation, KYB/KYC and support/refund journeys.

**Status:** No production provider contract or acceptance evidence established by this source review. This choice is **not active**.

## Alternative B — restricted nonfinancial public preview

Preserve the complete linked-card module in nonpublic development and do **not** publish the development provider. Disable linked-card funding at approved server/backend capability gates and in associated UI. Keep all other working funding pathways unaffected. Remove provider-only script references from the **reviewed preview output** only after ensuring no remaining script requires their registration. Explicitly label linked-card funding as unavailable; do not manufacture a successful provider response.

Prerequisites include exact reviewed source, tests verifying no linked-card quotes/authorisations/commits/reversals can execute through the public preview, zero hidden financial fallback, other-funding-source regression, no broken script graph, mobile/desktop UX and accessibility review, and a restricted artifact digest. Merely hiding a frontend button is **insufficient**.

**Status:** The user has authorised engineering work and investigation, not a specific live feature suspension. This option is **not deployed or separately approved**.

## Founder / Security decision gate

| Item | Current answer |
| --- | --- |
| Contracted production provider selected | No confirmed evidence |
| Explicit approval to disable linked-card funding on a public preview | Not independently recorded |
| Backend capability and money movement gates tested | Not for the proposed public preview |
| Existing wallet/card/funding functionality preserved in current development | Source unchanged |
| Public script dependency graph release-safe | No — development provider still referenced |
| Live Pages active deployment and P0 content exposure | Unverified |
| Rollback and protected deployer accepted | No |
| **Release verdict** | **NO-GO** |

**Recommendation:** Keep the current development linked-card simulation untouched while engineering a separately reviewed, synthetic public-preview capability profile. Do not release live linked-card funding until contracted provider, security, compliance and reconciliation evidence is accepted.

This record does not amend the production website, credentials, banking provider, release settings or financial execution authority.
