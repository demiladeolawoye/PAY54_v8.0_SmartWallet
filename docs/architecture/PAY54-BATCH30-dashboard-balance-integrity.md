# PAY54 Batch 30 — Dashboard Balance Integrity & Account Journey Safety

## Verified baseline

Protected `project-titan` contains PR #68 (merged `82176d5e1fa0a1c452d571e6e7b7ab804f4a179c`) and PR #69 (merged `81e5aa84e1f07792388662c9ff83ff30fa5545c4`). The original dashboard is a classic-script demonstration that reads a browser-provided `PAY54_LEDGER.getBalances()` value and has no production-trusted account read endpoint.

## Concrete finding and correction

The canonical `assets/js/dashboard-core.js` displayed a fabricated `70284035` when a selected balance was `0` or missing. That produces a materially misleading wallet presentation and cannot be accepted as production financial UX. This package removes the fallback, preserves legitimate zero and finite signed numbers, and instead displays **Balance unavailable** when the currency has no valid numeric balance.

The same render path now removes previous wallet display contents on a failed ledger read, rejects invalid currencies/amounts before constructing the list, and escapes wallet formatter output before its existing HTML-based preview rendering. This is a narrow, compatibility-preserving change to the existing classic script; no engine methods, payment logic, account-switching or ledger data are changed.

## Verification

The CI workflow executes the extracted canonical renderer against real JavaScript mocks for zero balances, missing data, negative values, failed ledger access, currency isolation, untrusted currency key injection and HTML formatter injection. It also reruns existing account-scoped read cancellation and authenticated wallet read admission regression tests.

## Explicit limitations

- The dashboard still uses **demonstration ledger data**. These tests do not attest regulated funds, server balances, a customer identity, tenant ownership, settlement or an actual backend account session.
- PR #68 account-read coordination is available as an opt-in module but is not wired to a real API. Directly equating legacy browser session state to an authorised account would be unsafe. Only independently authenticated backend account enumeration and a server-authorised read transport may activate the coordinator.
- Real-money account balances must be sourced from a server-verifiable double-entry ledger with balance provenance, as-of timing and controlled retries. No such production source is enabled by this change.
- No production Pages publication, cloud connection, database migration, payment partner or financial release is authorised.

## Next bounded packages

1. Backend: settle hosting/provider identity, PostgreSQL connection and secret custody with independent staging evidence.
2. Frontend: create verified server-side account read endpoints and connect the opt-in account coordinator through a separate protected acceptance package; preserve a strict demo/live distinction.
3. Launch office: independently verify actual Pages configuration and protect publication, while progressing UK–Nigeria regulated provider agreements and a real-device accessibility/test matrix.

**Decision: source-only review. PAY54 production NO-GO.**
