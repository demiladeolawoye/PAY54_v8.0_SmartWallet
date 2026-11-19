# PAY54 Batch 24 / 964 — Identity and Account Binding QA Matrix

**State:** Execution plan; evidence pending on real staging and devices. Synthetic CI assertions cannot substitute for production acceptance.

| Case | Scenario | Expected result | Operational proof owner |
| --- | --- | --- | --- |
| ID-01 | Valid Ed25519 short-lived access assertion with pinned issuer/audience | Signature accepted, no customer account selected until DB bind | Security / Identity |
| ID-02 | Wrong kid, forged signature, `alg=none`, ID-token or role claim | No SQL call, no session issued, redacted generic denial | Security |
| ID-03 | Expired/future/overlong assertion; clock skew | Denied without allowing clock-based replay | Security / SRE |
| ID-04 | Concurrent same issuer/JTI across two service instances | Exactly one receipt and one bootstrap session | Backend / DBA |
| ID-05 | DB COMMIT timeout, duplicate session digest, failed receipt insert | Zero leaked token; rollback or reauth after uncertainty | DBA / QA |
| ID-06 | Wrong Origin, duplicate headers, proxy spoof, oversized JSON | Rejected before token verifier/DB | Backend / AppSec |
| ID-07 | Missing distributed limiter or DDoS burst | Rate guard fails closed; abuse alarms without customer PII | Security / SRE |
| ID-08 | Bootstrap issued with no account and no financial access | `active_account_id=NULL`, no account/ledger balance disclosure | Backend / Fintech |
| ID-09 | First account bind to owned Personal or permitted Business | One old-token revoke, one new session and one audit | Backend / Security |
| ID-10 | Bind to other customer's Personal, revoked membership, suspended Business | No committed binding; no cross-tenant read | Security / QA |
| ID-11 | Competing tabs, offline app, stale response, mobile background | No stale account display, new session only after confirmed commit | Mobile / Frontend |
| ID-12 | VoiceOver, TalkBack, keyboard, 400% zoom and error recovery | WCAG 2.2 AA interactions and clear accessible status | UX / QA |
| ID-13 | PostgreSQL effective roles and function owners | Only callable EXECUTE; no direct DML; no BYPASSRLS | DBA / Security |
| ID-14 | Current published Pages artifact and release permissions | No backend SQL/private documents/keys; restricted deployer and rollback | DevSecOps / Release |
| ID-15 | UK–Nigeria KYC/KYB, AML, safeguarding and partner rails | Independently approved before real money; account bind grants no payment permission | Compliance / Fintech |

## Required evidence discipline

Each test must be linked to exact source SHA, separately approved staging environment, synthetic or consenting staging identity, observability correlation, redacted screenshot/trace, defect ID, QA owner and signature. Do not report a test as passed solely because CI ran with mocked dependencies.

**Decision:** No operational acceptance yet.
