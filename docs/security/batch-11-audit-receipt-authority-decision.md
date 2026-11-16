# PAY54 Project Titan — Batch 11 / Implementation 262
## Audit receipt authority and replay threat decision

**Date:** 2026-11-16
**Baseline:** `project-titan` at `748647e25adc7ec73224a13aa73403378aa058fd`
**Approved scope:** source-only Batch 11, up to 50 meaningful items beginning with 262
**No live data, credentials, IAM, cloud or payment execution authorised.**

### Verified source issue

Batch 10's `createAccountReceiptAuditedRead` accepts any injected `audit.publish` response containing `receiptAccepted:true`, `sourceAckOnly:true`, `durableStorageIndependentlyVerified:false` and `financialExecutionEnabled:false`. An ordinary JavaScript object can therefore mimic a receipt; its source provenance and one-use properties are not enforced. Even a genuine receipt could be replayed into a later disclosure unless consumption is tracked.

### Decision

1. Issue an opaque, frozen receipt only from `createAccountAuditReceiptGate` after a fully matching acknowledgement. Track receipt identity privately in a `WeakSet` that is not exported.
2. Consume each receipt **once**, at the disclosure boundary, with immutable operation/outcome/reason verification. Any copy, forgery, stale receipt or second consumption denies disclosure.
3. Preserve existing public fields for backward compatibility, retaining `sourceAckOnly:true` and `durableStorageIndependentlyVerified:false`. These source-level assertions do **not** prove a durable audit store or TLS security.
4. Keep the error surface generic. If the audit receipt cannot be consumed, no display result may be returned.
5. Strengthen source-audit and mutation tests to detect removal of provenance or consumption checks.

### Scope boundary and threat residuals

A malicious or incorrectly trusted injected writer can still fabricate `persistenceConfirmed:true` before durable storage. A separate independent audit-reader verification, retention policy and signed write receipt are mandatory before any real customer account data is exposed. Receipt object origin is only an in-process defence-in-depth check, not infrastructure attestation. No positive customer-data RLS, `SET ROLE` architecture, actual database connection or stage/production release is approved by this decision.

### GitHub Pages risk

Existing GitHub-managed Pages runs were observed after engineering-only source and document pushes (including run `43864575401` on Batch 10 HEAD). This is a **publication boundary issue** to be investigated with a safe source-only policy check. The actual Pages settings and public content must be verified by an authorised administrator before disabling or changing publication. Do not silently change hosting or DNS under this Batch 11 source-only approval.
