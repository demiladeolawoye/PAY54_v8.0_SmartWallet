# PAY54 Batch 12 Item 313 — Country and Partner Capability Gate Matrix

**Date:** 2026-11-16
**Stage:** SPECIFICATION / NO EXECUTION
**Default:** ALL UNCONTRACTED OR UNVERIFIED FEATURES OFF

| Country / corridor | Fiat wallet | Send/receive | Bank / local payout | FX | Card | Crypto buy / sell | Crypto transfer | Stablecoin settlement |
|---|---|---|---|---|---|---|---|---|
| UK | PROPOSED; banking/EMI partner approval pending | PROPOSED | PROPOSED | PROPOSED | ISSUER APPROVAL PENDING | OFF | OFF | OFF |
| Nigeria | PROPOSED; local regulated partner approval pending | PROPOSED | TWO ALTERNATIVE ROUTES REQUIRED | PROPOSED | ISSUER APPROVAL PENDING | OFF | OFF | OFF |
| UK → Nigeria | NOT LAUNCHED | PROPOSED | CONTRACTED UK FUNDING + NG PAYOUT REQUIRED | PRICING/SETTLEMENT TESTS OPEN | NOT APPLICABLE | OFF | OFF | OFF |
| Other markets | OFF | OFF | OFF | OFF | OFF | OFF | OFF | OFF |

**PROPOSED never means available or permitted.** A feature can be enabled only after a specific partner agreement, documented regulatory perimeter, AML/KYB/KYC obligations, data-protection approval, operational monitoring, live reconciliation, incident controls, independent testing and explicit release authorisation.

## Country feature evaluation contract

A source capability declaration must be checked against:

- country and legal entity
- verified customer residency, KYC tier and risk profile
- local regulatory permissions or exemption, legal counsel review and distribution/marketing permissions
- contracted partner product and jurisdiction scope
- supported currency and blockchain network, asset allowlist
- liquidity, withdrawal/deposit limits, Travel Rule, blockchain analytics and sanctions
- approved provider adapter and independently verified service health
- treasury limits, FX quote validity, settlement finality and safeguarding
- user acknowledgement, disclosures, complaints and operational escalation
- rollout approvals from compliance, security, finance and release management

If any essential attribute is absent, unknown, expired or revoked, **deny transaction preparation and execution**.

## Distinct regulated product categories

1. **Fiat banking/e-money**: safeguarded fiat wallets and payments through approved licensed service providers.
2. **Crypto buy/sell**: brokerage through suitably registered/authorised exchange/custody partner in each applicable market; crypto exposure must not appear as safeguarded fiat.
3. **Crypto withdrawal/deposit**: network-specific transfers with address and chain verification, sanctions/chain screening, Travel Rule and irreversible-transfer warnings.
4. **Stablecoin payments**: use as optional regulated and contracted wholesale settlement infrastructure only after end-to-end legal/accounting and payout-rail approval. No customer money claims of guaranteed 1:1 redemption without proof.
5. **Self-hosted wallets**: deferred; custody, key recovery and mistaken-transfer liabilities require a separate security architecture.
6. **Token issuance/staking/leverage/derivatives**: not in initial PAY54 scope, separately regulated and specifically blocked.

## Current regulatory research snapshot (verification needed again before launch)

**United Kingdom:** FCA's UK cryptoasset regime begins 25 October 2027; the FCA application period is 30 September 2026–28 February 2027. Current MLR registration requirements and cryptoasset financial promotion rules may apply before then. Formal legal classification depends on PAY54's exact functions, not the word 'aggregator'. Sources:
- https://www.fca.org.uk/firms/new-regime-cryptoasset-regulation/what-you-need-to-do
- https://www.fca.org.uk/firms/cryptoassets/who-needs-register
- https://www.fca.org.uk/firms/cryptoasset-financial-promotions-and-fiat-crypto-ramp-services

**Nigeria:** Nigerian SEC regulates applicable VASPs and virtual asset services; ARIP admission/AIP is conditional and is not a final licence. Check current SEC and CBN authority/perimeter requirements for each asset/service and any updated regulations and taxes before partner selection.
- https://sec.gov.ng/for-investors/sec-nigeria-clears-additional-vasps-for-accelerated-regulatory-incubation-programme/
- https://sec.gov.ng/fintech-and-innovation-hub-finport/registered-fintech-operators/

No PAY54 provider is represented as contracted, live, or licenced by the creation of this document.
