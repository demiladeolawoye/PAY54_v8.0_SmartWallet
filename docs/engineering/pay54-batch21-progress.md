# PAY54 CTO Batch 21 — Account Context Implementation Register

**Founder approval:** 17 November 2026
**Review PR:** #9 (draft; stacked on draft PR #8)
**Starting source:** Batch 20 final verified SHA `713411976ae56a8e3d9f59f68609661d7f599991`
**Scope:** 768–817, fifty auditable implementations.
**Current status:** 50/50 source deliverables committed; operational cutover NOT complete.
**Production:** NO-GO. No merge, deployment, active account switching or financial operation.

| Number | Delivered | Acceptance and actual limitation |
| --- | --- | --- |
| 768 | `backend/domain/account-context-directory.mjs` | Strict canonical server-provided account/member projection; read-only, frozen, fail-closed, no cross-principal entitlement |
| 769 | `backend/tests/account-batch21-directory.test.mjs` | Adversarial member isolation, revoked/suspended exclusion, duplicate/malformed denial |
| 770 | `backend/src/account-directory-service.mjs` | Trusted session/repository port; no live principal/session authority or HTTP endpoint |
| 771 | `backend/tests/account-batch21-directory-service.test.mjs` | No anonymous lookup; service denies failed/invalid store and membership |
| 772 | `.github/workflows/pay54-batch21-account-directory.yml` | Read-only pinned Node CI for new tests and retained Batch 20 boundary tests; new-head conclusion must be checked |
| 773 | `docs/engineering/pay54-batch21-progress.md` | Founder-facing source/change/P0 register |
| 774 | `backend/domain/account-read-session.mjs` | Server session freshness preflight: active, versioned, issued and unexpired |
| 775 | `backend/tests/account-batch21-read-session.test.mjs` | Adversarial expired/revoked/malformed session validation |
| 776 | Updated `backend/src/account-directory-service.mjs` | Session preflight must pass before repository access |
| 777 | Updated directory service integration tests | Expired-session denials and trusted clock handling |
| 778 | Updated Batch 21 CI workflow | Enforce syntax coverage of session preflight and account-directory tests |

| 779 | Updated implementation progress register | Reconciled security additions and outstanding source scope |

| 780 | `backend/src/account-scoped-directory-repository.mjs` | Fail-closed read-only scoped repository contract (no live database) |
| 781 | `backend/tests/account-batch21-scoped-directory-repository.test.mjs` | Negative actor, RLS, read-only, callback and dependency tests |
| 782 | `backend/src/account-directory-composition.mjs` | Compose session authority, scoped repository and account projection without wiring an endpoint |
| 783 | `backend/tests/account-batch21-directory-composition.test.mjs` | Cross-boundary happy-path, wrong actor, revoked session and missing dependency tests |
| 784 | Expanded dedicated Batch 21 workflow | Syntax checks for repository and composition; test glob covers new adversarial tests |
| 785 | Updated engineering register | Current committed count and remaining source work reconciled |

| 786 | Hardened scoped repository | Copy and freeze bounded database row snapshots during scoped read, reject non-string or malformed fields |
| 787 | Repository mutation and oversized-row tests | Verify detached copies, frozen records and fail-closed abnormal row shapes |
| 788 | Reconciled CTO security register | Record remaining active backend/database and audit requirements |

| 789 | `backend/domain/account-read-continuity.mjs` | Immutable authority recheck fence: reject session rotation, revocation and active account change during read |
| 790 | `backend/tests/account-batch21-read-continuity.test.mjs` | Session continuity adversarial regression |
| 791 | Hardened `backend/src/account-directory-service.mjs` | Second trusted session lookup after async repository read; withhold stale output |
| 792 | Updated directory service and composition tests | Read race/revocation regression and second trust check assertions |
| 793 | Expanded read-only CI workflow | Syntax coverage of continuity fence |
| 794 | `backend/domain/account-active-read-scope.mjs` | Session-selected active account and canonical membership view-only admission |
| 795 | `backend/tests/account-batch21-active-read-scope.test.mjs` | Negative wrong-account/expired/revoked/session role checks |
| 796 | `backend/domain/account-wallet-read-admission.mjs` | Reuses canonical ledger authorisation for account/wallet/journal read admission |
| 797 | `backend/tests/account-batch21-wallet-read-admission.test.mjs` | Wrong-wallet and cross-account journal denial, zero financial execution |
| 798 | Updated Batch 21 CI workflow | Syntax and test coverage of account/wallet read contracts |
| 799 | Updated engineering progress register | Reconciled 32/50 and operational P0 dependencies |

| 800 | `backend/domain/account-switch-request.mjs` | Strict untrusted account selection ID parser with role/identity field refusal |
| 801 | `backend/tests/account-batch21-switch-request.test.mjs` | Forged actor, role, balances and malformed request negatives |
| 802 | `backend/domain/account-switch-csrf.mjs` | Strict same-origin + timing-safe 32-byte CSRF session preflight |
| 803 | `backend/tests/account-batch21-switch-csrf.test.mjs` | Cross-origin and invalid token refusal |
| 804 | `backend/domain/account-switch-admission.mjs` | Compose canonical request, session, membership, CSRF and rebind preflight; nonexecuting |
| 805 | `backend/tests/account-batch21-switch-admission.test.mjs` | Stale version, revoked membership, same-account and CSRF denial |
| 806 | `backend/domain/account-switch-audit-intent.mjs` | Redacted precommit audit record; never a success claim |
| 807 | `backend/tests/account-batch21-switch-audit-intent.test.mjs` | Falsified audit/sensitive token negative cases |
| 808 | `backend/domain/account-cache-refresh-evidence.mjs` | Ten-domain cache/refresh completeness evaluator; independent proof still required |
| 809 | `backend/tests/account-batch21-cache-refresh-evidence.test.mjs` | Partial, duplicated or stale cache evidence refusal |
| 810 | `backend/governance/pay54-batch21-account-switch-cutover.mjs` | Fail-closed operational cutover claims and independent approval requirement |
| 811 | `backend/tests/account-batch21-switch-cutover.test.mjs` | Full self-reported claims never authorise a production release |
| 812 | `backend/tests/account-batch21-http-no-switch.test.mjs` | Live loopback HTTP 503 denial of unprovisioned accounts/context methods |
| 813 | `backend/tests/account-batch21-no-money-side-effects.test.mjs` | Nonexecuting session, wallet and admission regression |
| 814 | Updated Batch 21 CI workflow | All new account/context domain modules and governance syntax checks, new tests |
| 815 | `docs/engineering/pay54-batch21-change-request-register.md` | P0/P1 risk owner and operating decision register |
| 816 | `docs/engineering/pay54-batch21-closure-report.md` | Founder source closure, explicit operational NO-GO |
| 817 | Updated engineering progress register | Final 50/50 source-only traceability and production blockers |

## Outstanding operational acceptance (not counted as implemented source items)

Provision real server-owned account directory storage, session persistence and independently verified PostgreSQL RLS with live adversarial tests, then atomic and audited account rebinding, actual ten-domain cache isolation, production-permissioned transaction propagation, device QA, and protected deployment/rollback. Existing source modules are NOT equivalent to operational cutover. Independent Founder, Security and Release approval remains required.

## Current P0 release gates

- Historical GitHub Pages overpacked archive: actual current public reachability and sensitivity still need independent operational verification
- Excluded development linked-card provider: no public-asset relocation or silent funding disablement
- Real authenticated account switching: session persistence, restricted PostgreSQL transaction/RLS, session revocation, audit, CSRF, device QA
- Protected deployment identity, rollback rehearsal and verified restricted Pages artifact
- UK–Nigeria regulated money, safeguarding, provider contracts and reconciliation

**CTO decision:** Keep PR #9 as DRAFT, no merge/Pages publication. A read-only source boundary is not a functioning Business account switch. Future changes must preserve existing dashboard, wallet, ledger, cards, auth and security behaviour.
