
# PAY54 Enterprise — Staging Evidence Collection and Verification

**Phase:** 2G-U  
**Document version:** 1.0.0  
**Owner:** PAY54 Enterprise Engineering Office  
**Scope:** Private staging infrastructure  
**Release status:** BLOCKED  
**Cloud provisioning:** DISABLED  
**Financial execution:** DISABLED

## 1. Purpose

This document defines how PAY54 collects and independently verifies evidence for the seven staging controls established by Phase 2G-O.

Evidence collection does not constitute security approval, cloud provisioning authorisation, deployment authorisation or production readiness.

A successful automated workflow demonstrates only that the checks executed by that workflow passed.

All seven controls require evidence appropriate to their acceptance criteria before staging provisioning can be considered for separate authorisation.

## 2. Existing control systems

The following existing PAY54 files remain authoritative:

- `backend/governance/staging-evidence-register.json`
- `backend/governance/staging-evidence-submissions.json`
- `backend/governance/staging-evidence-audit.mjs`
- `backend/governance/staging-evidence-intake.mjs`
- `backend/governance/staging-evidence-source-integration.mjs`
- `backend/governance/staging-provenance-verifier.mjs`

This runbook does not replace their validation logic or create a second approval authority.

The staging infrastructure source remains:

- `infrastructure/staging/main.tf`

The protected deployment environment is:

- `pay54-staging`

The approved staging development branch is:

- `project-titan`

## 3. Mandatory evidence principles

1. Record only evidence that actually exists.
2. Never invent approvals, reviewer identities, cloud resources or service credentials.
3. Never publish passwords, API keys, tokens, service-account private keys, customer information or payment credentials.
4. A Git commit hash or matching SHA-256 digest demonstrates source consistency, not independent approval.
5. A submitter must not approve their own evidence.
6. Evidence from Google Cloud must be verified against the actual authorised cloud project, not merely against Terraform declarations.
7. Workflow success must not be interpreted as staging deployment approval.
8. Evidence verification and deployment authorisation must remain separate.
9. GitHub Pages must never become a hosting destination for privileged PAY54 backend services.
10. A control remains outstanding if independent verification is unavailable.

## 4. Evidence collection packages

### STG-01 — Independent release reviewer and approval enforcement

**Accountable role:** Release Manager  
**Independent verifier:** Independent Security Reviewer

Required evidence:

- The `pay54-staging` GitHub environment exists.
- Deployment branches are restricted to `project-titan`.
- At least one trusted reviewer other than the workflow initiator is configured.
- Required reviewers are enabled and saved.
- Self-review prevention is enabled and saved.
- Administrator bypass is disabled.
- The relevant approval decision is linked to an approved change.
- The independent reviewer is identifiable and authorised.

Current dependency:

PAY54 does not yet have an appointed independent reviewer.

Until an actual reviewer is appointed and the saved GitHub environment configuration is verified, STG-01 must remain `NOT_VERIFIED`.

A screenshot showing an unchecked reviewer setting is not approval evidence.

### STG-02 — Verified Google Cloud project and billing

**Accountable role:** Cloud Platform Owner  
**Independent verifier:** Finance and Security Reviewer

Required evidence:

- Approved Google Cloud organisation or project ownership.
- Actual project ID and immutable project number.
- Verified billing account linkage.
- Approved deployment region: `europe-west2`.
- Repository and owner identity matching the authorised GitHub repository.
- Written cost ownership and operational responsibility.
- Confirmed segregation from production workloads.

Only non-secret reference identifiers and appropriately redacted evidence may be recorded in the repository.

Cloud account setup or project verification must not implicitly enable Terraform provisioning.

### STG-03 — Secret Manager access controls

**Accountable role:** Principal Security Engineer  
**Independent verifier:** Independent Security Reviewer

Required evidence:

- Approved Secret Manager design.
- Named service identities and their intended access boundaries.
- Least-privilege IAM permissions.
- Secret rotation and revocation procedures.
- Audit logging and monitoring arrangements.
- Confirmation that no secret values appear in source, workflow logs or evidence records.

The evidence package may include policy documents and redacted configuration summaries.

Actual secret values must never be copied into the evidence register.

### STG-04 — Budget and cost alerts

**Accountable role:** Cloud Platform Owner  
**Independent verifier:** Finance Reviewer

Required evidence:

- Approved monthly staging spending limit.
- Verified cloud billing budget.
- Alert thresholds and notification recipients.
- Evidence that alert delivery is operational.
- Agreed escalation and cost-control arrangements.
- Resource capacity limits consistent with the staging design.

Budget configuration alone does not guarantee a hard spending cap. PAY54 must separately verify any mechanisms intended to prevent excessive costs.

### STG-05 — Private networking and egress security

**Accountable role:** Principal DevSecOps Engineer  
**Independent verifier:** Independent Security Reviewer

Required evidence:

- Private service ingress configuration.
- IAM-authenticated service invocation.
- Network architecture and service-to-service access model.
- Approved outbound destination allowlist.
- DNS and TLS enforcement controls.
- Application-level authentication and authorisation design.
- Relevant network and access-control test results.

Declaring `INGRESS_TRAFFIC_INTERNAL_ONLY` in Terraform is necessary but insufficient to demonstrate the complete security of a deployed application.

### STG-06 — Signed container provenance

**Accountable role:** Principal DevSecOps Engineer  
**Independent verifier:** Independent Security Reviewer

Required evidence:

- Approved source revision.
- Reproducible or traceable build provenance.
- Software bill of materials.
- Dependency and vulnerability review.
- Cryptographic image signature or equivalent approved attestation.
- Verified SHA-256 image digest.
- Approved regional image location.
- Evidence that the intended runtime uses the approved immutable image.

No container image may be treated as approved solely because a digest is syntactically valid.

### STG-07 — Formal cloud provisioning authorisation

**Accountable role:** Group CTO  
**Independent verifier:** Independent Release Approver

Required evidence:

- Independently verified STG-01 through STG-06.
- Approved change request and implementation scope.
- Documented rollback and recovery procedure.
- Named operational owner.
- Authorised provisioning window.
- Defined release decision and accountable signatories.
- Explicit authorisation for the specific infrastructure change.

STG-07 must remain `BLOCKED` until all prerequisites are satisfied.

A successful CI run must never change this status automatically.

## 5. Evidence submission process

All proposed evidence must use the existing Phase 2G-P intake schema.

The intake submission record contains:

- `id`
- `controlId`
- `sourceSystem`
- `recordId`
- `sha256`
- `recordedAt`
- `submittedBy`
- `reviewStatus`

Supported source systems are:

- `GITHUB`
- `GOOGLE_CLOUD`
- `INTERNAL_REVIEW`

Every newly submitted record must use:

`PENDING_INDEPENDENT_REVIEW`

Evidence intake must not represent the evidence as approved.

Only record authentic metadata with a calculated SHA-256 digest and a valid UTC timestamp.

The source identifier must point to a real retrievable record, accessible to the appropriate independent verifier.

The present intake file contains no evidence submissions. It must not be populated with fabricated records merely to increase the candidate count.

## 6. Source-integrity verification

GitHub evidence may be linked to a specific immutable Git commit and repository-relative path using the existing Phase 2G-T integration.

The verification process must:

1. Confirm the source belongs to the intended PAY54 repository.
2. Retrieve the referenced immutable Git source.
3. Recalculate the relevant SHA-256 digest.
4. Compare it against the submitted evidence digest.
5. Report mismatches and missing sources.
6. Preserve the requirement for independent review.

Matching a digest does not authenticate the original evidence submitter or establish approval of the associated staging control.

Google Cloud and internal review evidence require their own authorised verification processes.

## 7. Independent verification

An independent reviewer must:

1. Be a genuine authorised individual.
2. Be different from the evidence submitter and release initiator.
3. Review the actual evidence source.
4. Check the control's acceptance criteria.
5. Record findings in an auditable review process.
6. Reject insufficient, misleading or unverifiable evidence.
7. Avoid using personal access tokens or credentials in public evidence documents.

An unauthenticated username or manually entered approval claim is not sufficient.

Approval records require independently verifiable identity and source integrity.

## 8. Public repository confidentiality

PAY54 must assume that content committed to its public repository is publicly accessible.

Permitted public metadata includes appropriately non-sensitive control IDs, source file paths, Git commit identifiers, SHA-256 digests and redacted reference information.

Private operational evidence should remain in an access-controlled system.

The public repository may reference approved non-secret evidence identifiers without embedding confidential artefacts.

Do not publish raw cloud access policies, secret contents, customer records, security credentials or sensitive architecture details.

## 9. Verification status rules

`NOT_CONFIGURED` means the required capability has not been established or verified.

`NOT_VERIFIED` means the necessary evidence or independent verification remains outstanding.

`BLOCKED` means the control cannot advance under the current governance conditions.

`PASS` from an automated validation workflow does not by itself mean a staging control is independently approved.

The evidence register is authoritative for outstanding control requirements.

No evidence-processing script may independently activate provisioning or financial execution.

## 10. Release authorisation boundary

The following remain prohibited during Phase 2G-U:

- Terraform apply or destroy operations.
- Activation of the GitHub Workload Identity Federation provider.
- Deployment of PAY54 backend containers.
- Creation of privileged payment-processing services.
- Activation of real payment, wallet settlement or money-movement capabilities.
- Bypassing GitHub staging-environment protections.
- Granting staging approval based only on source validation.

Any future provisioning proposal requires a separate, explicitly authorised release process.

## 11. Phase completion conditions

Phase 2G-U evidence collection can be considered operationally established when:

1. The collection requirements for STG-01 through STG-07 are documented.
2. Evidence owners and independent verifier responsibilities are assigned.
3. The existing intake and source-verification mechanisms remain unchanged and operational.
4. Genuine evidence can be submitted without exposing secrets.
5. Outstanding controls are reported accurately.
6. Unverified evidence does not unlock deployment.
7. The first real evidence record is subjected to source and independent-review verification.

Documentation completion does not constitute completion of the seven security controls.

## 12. Current engineering decision

The evidence-collection framework may be maintained and tested in the `project-titan` branch.

PAY54 private staging remains blocked pending independently verified infrastructure evidence and formal approval.

Public demonstration functionality must remain separate from privileged backend and financial execution.

**PAY54 Enterprise Engineering Office — Phase 2G-U**
