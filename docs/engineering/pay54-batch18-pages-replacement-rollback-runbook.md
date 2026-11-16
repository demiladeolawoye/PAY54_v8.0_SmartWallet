# PAY54 — Protected GitHub Pages Replacement and Rollback Runbook

**Batch 18 item 661** · **Operating status:** Planning only — P0 OPEN  
**Owners:** Founder, Principal DevSecOps Engineer, Principal Security Engineer, Principal Release Manager

## Precondition: independent current-site investigation

1. The authorised repository owner visits GitHub **Settings → Pages** and records the actual publication source, displayed domain and HTTPS setting. No setting is changed during evidence collection.
2. Inspect the `github-pages` environment and protected branch/ruleset controls. Record permitted deployments, reviewer gate, least-privileged identity, credentials scope and bypass users.
3. Identify the latest successful **active** Pages deployment and independently associate its exact commit SHA, Actions run ID, artifact digest and UTC timestamp.
4. Preserve the previous known-good deployment/rollback artifact privately. The previously inspected historical artifact `14252395793` was overbroad; do **not** call it a known-good safe rollback without reviewing its contents and exposure.
5. Record public reachability and sensitivity using Security-approved bounded checks. HTTP HEAD responses alone cannot attest actual file content. Do not paste sensitive source or credentials into issues.

## Release candidate technical acceptance

1. Select an exact reviewed Git SHA, approve linked-card feature/provider disposition, and ensure the candidate's complete HTML/CSS/JS dependency graph contains no excluded infrastructure source.
2. Generate a restricted website staging directory from the reviewed manifest. It must contain only approved HTML, CSS, browser JS, fonts and visual assets. **Never upload the repository checkout root**.
3. Run the canonical source inventory, link and CSS audits, secret-marker review, third-party script integrity review and restricted directory tree scanner.
4. Hash the exact generated files with SHA-256 and compare those bytes to the proposed Pages artifact tar before upload, using the `pay54.pages-tar-source-byte-attestation.v1` source check.
5. Reject unexpected backend, docs, infrastructure, credentials, backup, source map, private keys, symlinks, duplicate tar paths or unknown tar entry formats.
6. Run login redirect, desktop/tablet/mobile dashboard and money-movement preview gates on the precise release commit. Repeat keyboard, screen-reader, navigation and linked-card feature-unavailable testing.
7. Require independent Security, Release Manager and Founder approval after successful staging and an independently verified rollback rehearsal. Source checks cannot self-approve production.

## Conditional authorised deployment procedure

Only after recorded approval: use the protected approved deployer, ensure an immutable reviewed artifact is the only Pages upload input, and record deployment run and content digest. No client-side demo or provider mock may claim real cards, settlement, KYC or financial compliance.

After deployment, inspect the **actual** published artifact and sample public internal paths. Confirm the four restored balance details, labelled as unverified when sample-only, as well as tablet Money Moves wrapping, mobile layout, login boundary and absence of prohibited source paths. Record user-visible regression evidence and communicate change completion only after independent verification.

## Rollback

Trigger rollback if any restricted source becomes reachable, a required script or login flow breaks, compliance preview language is lost, or transactional gates no longer fail closed. The Release Manager must restore the **previously verified safe** archive and version using a separately approved deployment, not an arbitrary old overbroad artifact. Verify restored HTTP behavior, content digest, login, security disclosure and account/payment unavailability. Preserve incident evidence and escalate sensitivity/credential review to Security.

## Current NO-GO reasons

- Historical GitHub Pages artifact overincluded backend/docs/infrastructure source, but actual active deployment and public reachability remain unverified.
- The current dashboard references `assets/js/infrastructure/payments/providers/linked-card-development.js`, which the production candidate rejects; no approved alternative has been integrated or feature suspension verified.
- Authenticated sandbox, device accessibility, protected deployer controls and rollback drill have not received complete operational acceptance for the proposed release.
- UK–Nigeria regulated money movement, provider agreements, safeguarding, KYC/AML, ledger reconciliation and tenant RLS require separate launch gates.

**No automation in this batch changes Pages Settings, deploys, rotates credentials, grants financial authority or alters customer funds.**
