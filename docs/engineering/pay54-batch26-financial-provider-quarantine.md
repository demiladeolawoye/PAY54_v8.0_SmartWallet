# PAY54 Batch 26 / 1059 — Development Linked-Card Provider Quarantine

**Observed repository source:** the existing dashboard HTML loads `assets/js/infrastructure/payments/providers/linked-card-development.js` before the linked-card adapter and funding service. The provider is labelled a deterministic development simulator. No current public Pages artifact was independently inspected.

**Zero regression approach:** retain development-path QA and existing card/checkout UI in approved offline tests. Do not delete the simulator without reviewing its full dependency tree; that could break the existing funding adapter, card UI and demonstration flows. Instead enforce a **deployment gate**: no public *financial* release can include or activate the development funding script. A separate, nonfinancial marketing preview may be considered only after tested removal/denial of all simulator-dependent customer actions.

Production replacement needs a contracted PSP/acquirer or bank-approved issuing/processor partner with PCI DSS scope, 3DS/SCA, card tokenisation, confirmed authorisation and capture, refunds/reversals/chargebacks, webhook replay protection, provider reconciliation, dispute escalation, spending limits, account-specific permissions and settlement audit.

Acceptance tests must cover quote expiration, duplicate capture, failed SCA, provider refusal, cross-currency errors, card freeze, account selection changes, parallel tabs, refund concurrency, network outage and ledger integrity. Developer-source success must never credit a real PAY54 balance.

**CR-CARD-01 P0 OPEN.**