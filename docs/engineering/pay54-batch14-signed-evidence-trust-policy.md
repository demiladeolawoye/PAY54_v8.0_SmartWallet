# PAY54 Batch 14 — Signed release evidence trust and custody policy

**Implementation:** 436
**Scope:** Source-only security governance; no operational key registration, deployment or IAM change
**Release disposition:** BLOCKED

## Trust boundary

The source modules `pay54-signed-release-evidence.mjs` and `pay54-signed-release-bundle.mjs` cryptographically verify supplied Ed25519 signatures against independently supplied public keys. A valid signature proves only that a corresponding private key signed the exact canonical claims. It does not establish that the human signer was authorised, that the review actually occurred, that the key remained uncompromised, or that the underlying release condition is satisfied.

## Mandatory controls before operational use

1. **Independent trust registry:** Security owns a separately governed signer-to-key mapping with versioned key fingerprints, approval scope, effective date and revocation status. Never accept a public key from the same evidence envelope as proof of trust.
2. **Private-key custody:** Private signing keys must be generated and stored within an approved non-exportable or appropriately protected signing service, with role separation, audit trail, rotation controls and incident revocation. No live private key, recovery phrase, HMAC secret or customer data may be committed to the repository or copied into GitHub Actions logs.
3. **Signer separation:** An evidence author and its independent reviewer must be separate authorised identities. Technical checks comparing usernames are not a substitute for real identity assurance, permission reviews and tamper-resistant access logs.
4. **Replay and binding:** Receipt identity, gate, commit SHA and signer must all match. Reused evidence identifiers across different release gates are invalid. Operational verification additionally needs immutable receipt storage and checks against previously consumed identifiers.
5. **Evidence freshness:** An independent policy authority sets evidence expiry per risk category and may revoke a receipt if code, partner environment, branch configuration or security posture changes. Local source tests cannot independently establish live evidence freshness.
6. **Multiple approvers:** Final release requires distinct Founder, Security and Release Manager acceptance and independent operational verification; a fully signed test bundle is never sufficient by itself.
7. **Key compromise:** If a signing credential is compromised, freeze release, revoke affected trust entries, identify all impacted receipts and request new evidence under fresh independent approvals. Preserve non-sensitive forensic metadata and route incidents through the security response process.

## Required review evidence

| Control | Owner | Independent acceptance |
| --- | --- | --- |
| Public-key binding and signer role | Security | Identity and permission audit |
| Signing service configuration | DevSecOps + Security | Key-custody and audit evidence |
| Evidence archive and replay store | Backend + Security | Append-only integrity assessment |
| Revocation and rotation | Security + Operations | Tested incident and recovery procedures |
| Source/commit provenance | Release Manager | Exact SHA and immutable CI evidence |
| Financial, legal and partner release permissions | Legal + Fintech Architecture | Contract and authorisation verification |
| Final deployment authorisation | Founder + Security + Release Manager | Separate explicit decision |

**Current status:** These are unimplemented operational acceptance controls. The Batch 14 verifier is source-only, its trusted registry is caller-supplied, and every result retains `releaseAuthorised:false` and `productionRelease:"BLOCKED"`. No release, account switch, customer database access or money movement may be enabled through this policy.
