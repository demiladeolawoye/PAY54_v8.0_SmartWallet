# PAY54 Architecture Decision — CR-PAYTAG-01 Universal Payment Identity

**Status:** Founder-approved product concept; source-only contract under independent review
**Decision date:** 19 November 2026
**Scope:** UK–Nigeria wallet MVP; later country-by-country extension
**Release authority:** NONE; existing production and Pages P0 findings remain NO-GO
**Related work:** GitHub Issue #29; Batch 17 PR #28 remains an independently reviewed but unmerged source stream at the time this document was authored

## Decision and existing implementation inventory

The PAY54 PayTag is a customer-controlled, optional payment identifier for a stable, authorised PAY54 account and wallet. A tag is **not** a bank account number, a database primary key, an identity credential, a payment token, an arbitrary Contacts label, or an independently sufficient transfer authorisation. Bank account details are offered only by supported partner and currency rails.

Existing modules inspected and intentionally retained:
- `assets/js/core/constants/contacts.js`, `assets/js/engine/contacts/core/storage.js`, `assets/js/engine/contacts/contacts.js` and `assets/js/services/contacts.js` already support contact metadata and lookup. They are **not** a globally unique, server-authoritative PayTag registry.
- `assets/js/recipient.js` currently coordinates browser-side recipient and dashboard interactions. It must not be made the authority to resolve or execute an inter-account transfer.
- `backend/domain/account-wallet-eligibility.mjs` and `backend/domain/account-ledger-boundary.mjs` provide read-only identity and account-scope contracts. They do **not** establish a working production transfer or registry.
- `dashboard.html` currently includes a **demonstration** account number and `@pay54-user` label. Neither is an issued production financial identifier. The sample resembles the brand's reserved namespace and must be updated to a valid synthetic alias during the subsequent reviewed UI rollout.

## Namespace and identity semantics

- Syntax contract for initial MVP: optional single leading `@`; 3–24 characters after prefix; initial ASCII letter; remaining lowercase ASCII letters/digits and single internal `.`, `_` or `-` delimiters. No consecutive, leading or trailing delimiters. Normalize ASCII uppercase to lowercase. Unicode and confusables are rejected rather than silently transliterated.
- The canonical string, excluding `@`, is a case-insensitive database uniqueness key. The display form is `@` plus canonical string. The exact reserve/disallow catalogue is a versioned policy and requires Security/Legal review before the authoritative namespace is activated. The initial source contract reserves PAY54, support, verified, institutional and similar names and the `pay54-`, `pay54_`, `pay54.` prefixes.
- A PayTag can bind to one active, eligible account and one stable wallet identity at a time. Registry records must refer to immutable internal UUIDs and a monotonically increasing alias-version. Historical transaction entries retain recipient identity and the resolved alias version for audit.
- **Never infer availability, ownership, existence or recipient status from the syntax normaliser.** The new `backend/domain/paytag-identity-contract.mjs` is pure and has no DB or financial execution authority.
- One-to-one / one-to-many policy for Personal and Business accounts, alias transfers, cooldown periods and Business display-name/KYB treatment require separate documented decisions. Do not implement ad hoc reassignment.

## Planned authoritative persistence and resolution boundary

P1 implementation after review should introduce a separate PostgreSQL-backed registry with a unique canonical alias index, account/wallet foreign keys, lifecycle status, record version, temporal audit and a safe rotation/recovery policy. Registration, rename, disable and recovery must occur inside an authenticated, account-authorised database transaction with row locking/uniqueness checks. PostgreSQL tenant isolation and grants must be independently proven with denied cross-tenant tests. Do not store an authoritative registry in `localStorage`.

The authenticated resolution service will:
1. Enforce subject identity, scoped account access, membership, policy/consent and risk rate limits before responding.
2. Accept only a canonical identifier, with request-size limits, audit logging, abuse throttling and privacy-limited responses.
3. Resolve via the trusted registry to a stable wallet/account identity, validate wallet eligibility and return only an approved recipient-confirmation display name, alias version and permitted currency corridors. Do not expose internal UUIDs, phone, email, KYC details, hidden accounts or a public directory.
4. Revalidate record version, ownership, eligibility, recipient consent and risk policy immediately before creating a transfer intent. If the tag changed or was reassigned, fail closed and require new confirmation.

## Transfer lifecycle and ledger invariants

`PayTag → server-authoritative recipient resolution → confirmed beneficiary → existing trusted transaction authorisation → existing financial ledger`. No separate mutable balance engine.

- Initiating account context is explicit (Personal/Business); authorisation happens on the server, not a UI event or stored contact value.
- The sender sees a verified recipient display name, amount, currency, fee/FX disclosures and an unambiguous confirmation, followed by step-up authentication appropriate to the risk.
- Payment idempotency and duplicate-request protection must bind sender, destination wallet UUID, alias version, amount/currency, fee/FX snapshot and intent expiry. Replays or changed mappings fail closed.
- Ledger posting requires atomic debit/credit and reconciliation, sufficient available funds, limits, fraud/AML/sanctions gates, auditability, exception handling and genuine reversal/dispute routes.
- Cross-currency and external bank payouts require separately approved licensed rails; PayTag itself cannot trigger a conversion or bank transfer.

## Dashboard and accessibility

- Mobile-first balance panel: show `@paytag` with a readable copy/share control; show masked account details and reveal full account information only behind authenticated `Receive → Account details`, within the approved partner/currency scope. Never label a synthetic account value as a real bank account.
- `Send → PayTag`, `Contacts`, `Receive`, QR and secure payment requests share one canonical recipient-resolution contract. QR/payment links should contain no hidden account numbers or trusted authorisation tokens.
- Confirm recipient name before payment; provide a correction route and never offer a misleading success animation before server-authoritative confirmation.
- Keyboard, screen-reader, contrast, small-screen and deceptive/unicode name tests required.

## Threat model, controls and no-go gates

| Threat | Preventative controls | Negative acceptance |
| --- | --- | --- |
| Alias squatting or lookalikes | Reserved namespace, initial ASCII-only policy, security reviews | Institutional/confusable claims rejected |
| Concurrent registration | Unique DB index, single transaction, conflict handling | Exactly one of two concurrent claims succeeds |
| Alias reassignment during Send | Stable recipient binding, alias version and just-in-time check | Recipient change triggers reconfirmation |
| Account takeover | Strong session, step-up auth, cooling-off and recovery audit | Unauthorized rotation denied |
| Recipient enumeration | Authentication, privacy consent, minimal output, limiter | No public lookup or information-rich errors |
| Cross-tenant reference | Account-scoped queries, PostgreSQL RLS, role checks | Cross-tenant requests denied |
| Duplicate transfer/replay | Idempotency + trusted ledger invariants | No second posting or stale-intent payment |
| Sensitive information exposure | Default account masking, API minimisation | Contact lookup cannot reveal bank/identity data |
| Browser bypass | Trusted posting service, no financial client authority | Browser-only input cannot create ledger entries |

## Phased delivery and release evidence

**P0 (this branch):** canonical syntax and masking contract, adversarial unit tests, decision record and dedicated read-only source CI. No new website code, contact persistence, routes or DB mutations.

**P1:** server-backed registry + trusted resolver with migrations, direct access restrictions, auth/RLS tests and release policy. Must be independently reviewed and tested against provisioned staging before any claim of backend functionality.

**P2:** sandbox-only Send, Receive, QR, contact picker and immutable beneficiary intent integration with existing trusted transfer/ledger, verified response fixtures, abuse tests and device/accessibility QA.

**P3:** controlled, separately authorised opt-in pilot after partner, regulatory, security, safeguarding, fraud/AML, monitoring, disputes, rollback and Founder/Release acceptance.

**Explicit non-goals for P0:** no Pages deployment, no customer onboarding, no real financial ledger execution, no bank account issuance, no tag reservation, no active API, no contact data migration, no personal data, no implicit feature activation.

**Change control:** retain Issue #29 OPEN; link this design PR, review every next-stage implementation independently, and do not merge or alter protected `project-titan` or `main` without the normal CI/reviewer gate.
