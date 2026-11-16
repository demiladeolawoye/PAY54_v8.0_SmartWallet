# PAY54 Batch 12 Item 328 — Global Account and Transfer Integration Plan

Date: 2026-11-16
Status: Source-only; no live account switch, market or transfer activation.

## Founder-approved direction

One PAY54 app for authorised Personal and Business accounts, a global directory for permitted PAY54-to-PAY54 transfers, and market-specific regulated rails beneath an intuitive Send Money journey. Build candidate corridors across UK, US, EEA, Canada, Australia and selected Asian markets to Nigeria, without suggesting those are contracted or available.

## Recipients

The former large standalone dashboard legacy card is replaced by a compact Frequent people disclosure inside Money Moves. The same recipient widget is moved, not recreated, preserving data nodes and handlers. Full recipient management remains accessible through existing transfer functionality. Production must ultimately scope saved beneficiaries to the authenticated selected account; cross-account exposure and contact enumeration must fail closed.

## Personal and Business switching: NOT COMPLETE

Existing dashboard account-switcher-contract and account-switch-selection source implement a non-executable preview only. The sidebar label is presentation, not a genuine account switch.

The real implementation must:
1. Retrieve authenticated account membership, roles, ownership and Personal/Business state from the backend.
2. Display only authorised accounts and use accessible keyboard/assistive picker states.
3. Authorise every switch on the server; refuse suspended/revoked membership.
4. Invalidate account-specific balances, cards, beneficiaries, transactions and client caches on selection.
5. Prevent stale in-flight responses and concurrent session requests from crossing tenants.
6. Reverify fresh server membership, PostgreSQL RLS, payment limits and durable audit before sensitive reads/writes.
7. Independently test logout, token revocation, role change, multiple tabs and concurrent Personal/Business switches.

No account-switch activation is included in item 328.

## Global PAY54-to-PAY54 network

Same-currency, same-country and same legal entity/ledger domain can be a candidate for internal posting, but only with server membership, confirmed balances, double-entry posting, risk checks and durable ledger audit. Different legal entities or ledger domains need settlement arrangements. Cross-country PAY54 IDs do not bypass FX, safeguarding, IMTO/payout requirements, sanctions, compliance or partner approvals.

Source-only route classifier: backend/domain/pay54-p2p-route-preview.mjs. No execution permission.

## Balance Movement

The new source calculation supports 7, 30 and 90 days using decimal-string integer minor units, account/currency matching, exact date windows, no division-by-zero fabricated percentages and explicit non-attested flags. Until opening/closing snapshots come from authenticated and independently verified ledger history, the dashboard retains a neutral unavailable display.

Source-only calculation: backend/domain/balance-movement-projection.mjs.

## Corridor registry

Global candidate markets in backend/domain/nigeria-bound-corridors.mjs: GB, US, DE, FR, NL, ES, IE, CA, AU, SG, AE and JP, all to NG, all execution-disabled. EEA country-by-country authorisation and Asian country-specific rails must be considered separately.

## Integration backlog and approval

| Priority | Next work | Proof of completion |
|---|---|---|
| P0 | Real Personal/Business switch | Authenticated server context, role/RLS tests, revocation and stale response cancellation |
| P0 | Global PAY54 ID directory | Privacy-safe discovery, abuse prevention, verified beneficiaries |
| P0 | Canonical transfer intent | Signed/fresh consent, quote validity, idempotency, double-entry and audit |
| P0 | Origin country and Nigerian payout | Partner contracts, corridor-specific permissions, reconciliation and chargebacks |
| P1 | Balance Movement wired to ledger | Verified snapshots, accurate time window, QA across currencies |
| P1 | Recipients UX release QA | Desktop/mobile accessibility, handlers and visual review |
| P0 | Security/compliance/cloud gates | Independently approved customer data access and release |

No production, customer account read, cloud change or real-money movement authorised.
