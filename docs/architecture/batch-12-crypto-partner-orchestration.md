# PAY54 Batch 12 Item 314 — Crypto Partner Orchestration Architecture Decision

**Decision:** Build PAY54 as a regulated-perimeter-aware **customer-intent/orchestration layer** on top of separately contracted exchange, custody, liquidity, fiat banking and payout providers. No own-token issuance, private-key custody, direct exchange or self-custody product in the initial phase.
**Status:** APPROVED FOR SOURCE-ONLY DESIGN; NO CRYPTO TRANSACTIONS AUTHORISED.
**Markets under review:** UK and Nigeria, then country-by-country.

## Functional experience

A verified customer opens **Crypto Hub** in PAY54 and, subject to available products and risk eligibility, can view an asset list, live partner-sourced quote, transparent spreads/fees and custody status. The customer must confirm risk disclosures, total funds involved, settlement route and final destination before a provider action is requested. The system must not pretend a crypto asset is fiat or safeguarded deposit.

### Proposed buy example (GBP to BTC)

1. Customer chooses Buy BTC, enters GBP spend amount.
2. PAY54 verifies capability, customer eligibility, KYC/AML and explicit product consent.
3. The backend requests a time-limited quote from an eligible, contracted exchange partner; quote includes exact pair, network, price, fees, expiration and expected delivery.
4. PAY54 revalidates the quote and available cleared funds, creates a unique idempotent intent and reserves/charges via approved payment-provider flow. No balance change based solely on an optimistic frontend status.
5. A regulated partner executes and books the crypto. Custodial holdings must be reconciled against provider statements and independently verifiable records.
6. PAY54 presents provider-confirmed credited balance, transaction history and a separately stated market risk warning. Pending or disputed transfers retain their true pending status.

### Proposed sell example (BTC to NGN)

Only if an authorised/contracted partner can legally supply the exact service in both jurisdictions:
1. Confirm asset custody, transferable balance and risk checks.
2. Display BTC sale price, net fees, NGN quote and payout destination.
3. Obtain explicit confirmation and submit unique intent.
4. Partner exchanges crypto to fiat and returns authenticated execution/settlement records.
5. Funds reach the approved Nigerian payout rail; PAY54 reconciles both provider legs and shows delivery only after verified settlement.
6. If a step fails, freeze ambiguous state, escalate with evidence and perform appropriate returns/compensation through partner rules. Never automatically 'retry' an irreversible blockchain transfer.

This BTC-to-NGN journey is a future design, not a claim that UK/Nigeria crypto remittances are permitted or partners available today.

### Proposed stablecoin-powered cross-border payout

GBP → contracted UK fiat rail → regulated liquidity partner → stablecoin transfer on an approved chain → contracted, compliant Nigerian off-ramp → NGN bank payout.

This is an **optional infrastructure rail** to compare with direct fiat partner routing. The customer may only see a normal GBP→NGN transfer if partner contracts, legal disclosures, execution authority and customer consent permit it. Hidden use of crypto without appropriate disclosure or permission is prohibited.

## PAY54 architecture

Core Identity & Compliance → Payment Intent / Quote Engine → Regulatory Capability Gate → Provider Orchestration → Exchange & Custody Adapters / Blockchain Monitoring → Canonical Money Ledger → Reconciliation & Settlement → Customer UX / Support

### Provider interface separation

- **Identity adapter**: KYC/KYB, sanctions, residency checks, beneficial owners and enhanced due diligence.
- **Exchange/liquidity adapter**: asset and market eligibility, price/fees, locked quote, executed trade, partner order reference, failure codes.
- **Custody adapter**: custodial wallets, omnibus/subaccount mapping, reconciled holdings, withdrawal approvals and audit evidence.
- **Network/Travel Rule adapter**: asset+chain pair, destination screening, compliance transfer metadata, transaction hash/confirmations and chain reorg detection.
- **Fiat on/off-ramp adapter**: local funding, bank payout, settlement receipts, safeguarding responsibility and disputed refund routing.
- **Risk engine**: AML, fraud, sanctions, velocity, blockchain screening, depeg and liquidity conditions.
- **Journal/reconciliation**: exact decimal amounts, no floating-point ledger balances, atomic holds/commit, clearing accounts, provider and on-chain references, suspense queues.

Never duplicate ledger business logic inside the crypto module. Provider states must map into canonical transaction state transitions with immutable event IDs.

## Source-only implementation contract

- No live provider keys, wallet generation, blockchain RPC or transaction signing.
- Default-deny every crypto capability until legal entity, country, asset, chain, provider service, customer permissions and independent release approval are verified.
- Use exact decimal precision and asset-specific scale; distinguish crypto holdings from fiat ledger/safeguarded funds.
- Quote snapshots are immutable, limited-life and user-confirmed; execution requires server-side revalidation.
- All funds movement has idempotency keys, per-provider status mapping and durable audit.
- Webhook input must be authenticated, replay-resistant and tied to a known partner order; HTTP 200 alone cannot mark success.
- Partner and liquidity outage, chain congestion, wrong network, bad destination, depeg, bankruptcy, clawback, partial settlement and AML hold must fail closed.
- Customer custody/legal disclosures and liability are explicit; show irreversible withdrawal warnings and no deposit-protection implication.
- Operational restrictions include transaction limits, manual review and an incident kill switch per provider/asset/market.

## Recommended phased rollout

| Phase | Customer product | Prerequisites | Gate |
|---|---|---|---|
| 0 — research | Market/asset education without prices or solicitations requiring approval | Compliance review of content/marketing | DISCOVERY |
| 1 — partner demo | Synthetic sandbox Buy/Sell/Convert UX, no customer funds | Sandbox partner, source policy, negative tests | TEST-ONLY |
| 2 — limited brokerage | Selected permitted assets/markets, provider-custodied buy/sell | Contracted/licensed partner, promotions, AML/Travel Rule, custody/reconciliation | SEPARATE APPROVAL |
| 3 — on/off-ramp | Approved bank deposit/withdrawal and crypto settlement | Legal corridor, payout rails, treasury and partner evidence | SEPARATE APPROVAL |
| 4 — cross-border stablecoin | Optional partner-to-partner settlement route and user transparency | Approved stablecoins/chains, travel rule, off-ramp liquidity, depeg controls | SEPARATE APPROVAL |

### Commercial model

Potential revenues are disclosed partner brokerage/FX fees, approved interchange/referrals and payment orchestration margin. Model fee economics net of liquidity cost, chain gas, chargebacks, fraud, custody/insurance, sanctions/AML, support, disputes and partner reserve requirements; avoid assuming every crypto transfer is cheaper or instant.

## Risk and regulatory references

- UK FCA: https://www.fca.org.uk/firms/new-regime-cryptoasset-regulation/what-you-need-to-do
- UK FCA promotions/ramp: https://www.fca.org.uk/firms/cryptoasset-financial-promotions-and-fiat-crypto-ramp-services
- UK FCA MLR: https://www.fca.org.uk/firms/cryptoassets/who-needs-register
- Nigeria SEC: https://sec.gov.ng/for-investors/sec-nigeria-clears-additional-vasps-for-accelerated-regulatory-incubation-programme/

Regulatory permissions must be verified with qualified UK/Nigerian counsel against the actual provider, product, legal entity and promotion route. No claim here constitutes legal authorisation or approval.
