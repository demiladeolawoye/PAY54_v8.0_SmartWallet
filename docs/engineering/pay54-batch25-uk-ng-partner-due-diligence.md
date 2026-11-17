# PAY54 Batch 25 / 1013 — UK–Nigeria Partner and Regulated Rail Acceptance

**Status:** Architecture and contractual due-diligence requirements. No production rail, licence, safeguarding structure or payment-provider contract is represented as signed.

## PAY54 orchestration structure

PAY54 remains a customer experience, risk intelligence and payment orchestration layer above independently contracted infrastructures. The first corridor is UK→Nigeria, with Nigeria serving as the repeatable country-market profile before future African expansion.

Use distinct providers for: (1) UK inbound bank/payment rails; (2) a global cross-border FX/settlement backbone; (3) Nigeria primary local payout; and (4) Nigeria secondary local payout. The chosen global backbone and Nigerian partners are subject to actual commercial/regulatory approval. Do not confuse a technical sandbox or developer reference with a licensed provider. Local strategic alternatives must have independent failure modes, SLA and reconciliation processes.

## Mandatory commercial and regulatory gate

For **each** of the four roles, record executed contract, explicit regulated permissions, customer funds-flow/safeguarding diagram, AML/sanctions/KYT responsibilities, source-of-funds/KYC/KYB ownership, FX quote timestamps/expiry, settlement and prefunding economics, idempotency/webhook signature handling, refunds/disputes, data residency/DPA and outage/failover service commitments. `inspectPay54UkNigeriaRailReadiness` checks structural evidence completeness only; it does not inspect real contracts.

Obtain a separately signed legal/compliance matrix for UK FCA/payment/e-money permissions and the relevant Nigerian bank/PSP and payment-network arrangements. Confirm who holds customer balances, who can issue named accounts/cards, how funds are safeguarded, AML reporting obligations, sanctions escalations, operational resilience, fraud reimbursement and complaints ownership.

## Technical acceptance

- Configure provider abstractions/adapters and market profiles independently of UI. Expose only contracted, completed and independently tested operations.
- Verify exchange quote integrity, rate spreads/fees and card or bill payment economics before granting customer rewards or initiating payout.
- Test duplicate orders, replayed callbacks, partial payout, FX stale rate, refusal, AML hold, settlement mismatch, provider outage/failover and reconciliation corrections without artificial wallet credit.
- Preserve double-entry ledger authority and immutable audit; no browser success or provider API response alone posts customer funds.
- Test Personal/Business eligibility separately; no account switch creates financial permission.

**Decision:** CR-FINTECH-01 remains P0 OPEN. No real money, FX settlement, card issuer or bills integration is authorised by this document.