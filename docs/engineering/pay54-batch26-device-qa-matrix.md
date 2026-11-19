# PAY54 Batch 26 / 1061 — Device, Browser and Account-Context Acceptance Matrix

**Execution status:** source-level QA scenarios defined; no real device or staging results claimed. Every acceptance case requires exact reviewed code SHA, separately approved environment and redacted evidence signed by a QA owner.

| ID | Test family | Required observation |
| --- | --- | --- |
| B26-QA01 | First Personal account after trusted login | Real signed assertion, JTI consumption, unbound bootstrap, authorised membership and credential rotation |
| B26-QA02 | Business account context | Valid KYB/member role, no cross-account financial data, no payment privilege granted by context alone |
| B26-QA03 | Cross-tenant attempt | Forged principal, suspended membership and stale session return 401/403/503, never a default wallet |
| B26-QA04 | Multi-device logout and revocation | Old tokens revoked across app/browser and server, no cache resurrection |
| B26-QA05 | Tabs/network races | Account switch cancels requests and refreshes ten account-specific data domains before updated balances |
| B26-QA06 | iOS/Android | Background, connectivity loss, token expiry, biometric/MFA reauth and permission denial behave consistently |
| B26-QA07 | Accessibility | WCAG 2.2 AA, TalkBack/VoiceOver, keyboard, accessible error messaging, 200–400% zoom |
| B26-QA08 | Financial simulation | Development card provider never credits real money, capture/reversal remain isolated from ledger |
| B26-QA09 | Partner sandbox | FX quote expiry, duplicate webhook, payout idempotency, split settlement and provider failover |
| B26-QA10 | Hosting | Public Pages serves only verified static bytes, no backend source/private docs or sourcemaps |
| B26-QA11 | Rollback | Known-good signed web artifact can be restored through protected environment with public recheck |
| B26-QA12 | Security operations | Auth rate limiter outage fails closed; redacted events never disclose JWT, CSRF or provider secrets |

**Release result:** real QA OPEN, independent Security/Compliance/Release acceptance required.