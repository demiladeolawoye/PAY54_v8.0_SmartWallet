# PAY54 Project Titan — Batch 11 Item 309
## Founder Decisions and Change-Request Approval Ledger

**Date:** 2026-11-16
**Engineering branch:** project-titan
**Current release authorisation:** NONE
**Batch:** 262–311 source-only Founder-approved engineering. 312 onwards requires separate approval.

### Founder decision log

| Decision | Priority | Specific decision and required independent evidence | Status |
|---|---|---|---|
| FR-11-01 | Critical | Verify GitHub Settings → Pages, publishing branch and folder, live URL, any linked custom domain and exact public artefacts; decide containment if internal content is reachable | OPEN |
| FR-11-02 | Critical | Approve dedicated GitHub deployer identity, protected branch and environment reviewers, controlled OIDC before any administrative change | OPEN |
| FR-11-03 | Critical | Independently verify STG-05 cloud project, network, private ingress, egress, DNS/TLS, workload identity and Terraform approval | OPEN |
| FR-11-04 | Critical | Commission independent PostgreSQL role/credential custody, RLS tenant isolation, TLS handshake and audit durability reviews | OPEN |
| FR-11-05 | Critical | Approve customer data access and payments only after explicit compliance/security acceptance; neither is authorised now | BLOCKED |
| FR-11-06 | Critical | Contract UK/NG banking, backbone and payout providers with KYC/KYB/AML, safeguarding, reconciliation and dispute support | OPEN |
| FR-11-07 | High | Review external security / penetration, resilience, device and accessibility acceptance evidence | OPEN |
| FR-11-08 | Critical | Sign a separate staging/production release authorisation after all independent gates pass | BLOCKED |
| FR-11-09 | High | Approve a dated launch programme with owners, acceptance criteria, dependency/cost estimates and separate mobile/web milestones | OPEN |

### Engineering change requests

| Change request | Proposal | Decision gate | Current state |
|---|---|---|---|
| CR-SEC-11-01 | Replace mutable GitHub Actions tags with independently verified immutable upstream commit SHAs | Upstream release/maintainer verification, phased PRs, full regressions | PROPOSED; NO UNVERIFIED SHA PINNING |
| CR-SEC-11-02 | Configure protected release environments and dedicated deployer account | Repository owner security/admin review and explicit IAM approval | NOT EXECUTED |
| CR-SEC-11-03 | Restrict GitHub Pages to approved static site artefacts | Verify deployed contents and publication source first; protect existing user-facing flows | OPEN |
| CR-SEC-11-04 | Deploy independently verifiable durable audit, and post-commit readback/receipts | Operational design review and compliance retention approvals | OPEN |
| CR-PROD-11-01 | WhatsApp and social-channel authenticated PAY54 access | API policy, compliance, signed intents, partner commercial model | DISCOVERY |
| CR-PROD-11-02 | SELLIBUY marketplace with compliant seller/payments trust architecture | Separate buyer/seller protection, dispute, tax and partner approvals | DISCOVERY |
| CR-PROD-11-03 | FX routing optimisation and multi-provider fallback | Contracted partner capability, quote/settlement transparency and failover tests | CORE ROADMAP |
| CR-PROD-11-04 | Virtual cards, Apple/Google wallet tokenisation, rewards and newcomer use cases | Approved issuer/processor, tokenisation contracts and unit economics | PARTNER DEPENDENT |
| CR-PROD-11-05 | Stablecoins and regulated digital asset capabilities | Regulatory, custody, AML, Travel Rule, bank/partner requirements | FUTURE / NO ACTIVATION |

### Standing no-regression commitments

Preserve current application functionality; source changes are limited to the approved branch. Do not write secrets to the public repository, enable customer SELECT, grant real PostgreSQL credentials, switch on payment processing, alter GitHub Pages administration, change DNS, activate cloud OIDC, provision infrastructure or trigger production deployment without a separate, recorded Founder approval. Successful Node/PostgreSQL source CI is not an independent production security or regulatory attestation.

**STOP:** Item 311 closes Batch 11 source-only implementation. New item 312 requires an explicit new Founder approval with its scope and exclusions.
