# PAY54 Batch 23 / 913 — Authenticated Account Context QA Acceptance Matrix

**Status:** Not executed on real devices or on provisioned staging. All cases require measured evidence; passing source CI is not acceptance.

| Case | Setup and method | Expected result | Evidence |
| --- | --- | --- | --- |
| QA-AC-01 | Principal A Personal, Principal B Personal, separate browser profiles | A cannot enumerate or select B's Personal account | Authenticated HTTP responses + redacted RLS SQL traces |
| QA-AC-02 | Business owner, admin, operator, viewer and invited/revoked member | Role-specific view/manage/initiate/approve restrictions; no implicit funding | Membership matrix, backend denials and payment logs |
| QA-AC-03 | Switch A Personal → authorised Business on Android/iOS/desktop | Old session revoked, new random token and CSRF returned only after durable commit | Token-digest audit and session-version trace |
| QA-AC-04 | Reuse old token / CSRF after successful switch | 401/403 on protected future endpoint; no rollback to prior balances | Negative authentication logs and account-bound caches |
| QA-AC-05 | Two tabs submit simultaneous switch against same old session | Exactly one commit and one audit; loser denied, no dual-active sessions | PostgreSQL concurrency trace and browser network capture |
| QA-AC-06 | Failing audit insert, duplicate token digest and uncertain commit | Zero partial business switch; reauth after uncertain commit | DB transaction integrity, negative logs |
| QA-AC-07 | Network loss, refresh, background/resume, out-of-order response | No Personal history/cards/balance leaked into Business; blocked stale requests | Screenshots, HAR with redacted secrets, cache event telemetry |
| QA-AC-08 | Pending, suspended, revoked, closed or KYB-rejected Business | Account hidden/refused; financial operation not authorised | RLS and API 401/403/503 evidence |
| QA-AC-09 | VoiceOver, TalkBack, keyboard-only, 200–400% zoom | Account context selector has clear labels, focus, errors and screenreader announcements | WCAG 2.2 AA audit results |
| QA-AC-10 | Approved FX/cards/bills flows under selected account | Funds, journal, provider eligibility and reconciliation independently scoped | Finance and partner sandbox signoff; no synthetic credit mistaken for real money |
| QA-AC-11 | RLS role grants changed, bad TLS CA and database failover | Fail-closed readiness, no privileged fallback, no token in logs | Staging probes, secrets redaction and incident drill |
| QA-AC-12 | Pages artifact, protected release and rollback exercise | No backend/secrets/public debug code; current exposure independently closed | Published SHA, exact URLs, checksum and release signoffs |

## Test coverage and acceptance owners

QA Automation owns executable browser/API automation, Principal Mobile owns device sessions/backgrounding, Principal Security signs RLS and token abuse-cases, Fintech Architect signs financial permission/reconciliation, Principal Release Manager signs rollback and environments, UI/UX signs accessibility.

No test can be marked passed based on a mock-only result or screenshot without authoritative session/backend evidence. Account switching must remain disabled until all critical cases have real staging results.

**Current verdict:** QA cases pending; platform production NO-GO.
