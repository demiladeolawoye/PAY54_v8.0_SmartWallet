# PAY54 Batch 26 / 1053 — Static Artifact Attestation and Independent Reviewer Trust

**Trust sequence:** reviewed source SHA → offline static-only build → deterministic file hashes → trusted build provenance → actual GitHub deployment metadata → current public URL observations → independent signed reviewer attestation.

Each transition is a separate trust boundary. A valid SHA-256 of files supplied by one actor does not prove those files were deployed. A signed reviewer statement proves only signature possession, not the truth of the observation. The Batch26 verification functions expose these limitations as explicit false fields.

**Canonical technical requirements:** exact 40-character Git SHA; SHA-256 manifest for every static file; no symlinks, hardlinks, dotfiles, backend, SQL, internal docs, private keys, map files or development payment provider; HTTPS domain allowlist and controlled response retrieval; Ed25519 reviewer key under independent Security control; independent GitHub Pages Settings and deployment API authentication; no automatic release permission.

**Separation of duties:** a source author cannot be sole reviewer, artifact builder, release operator and Compliance signatory. Capture two independent engineering reviewers, Security and Release, plus regulated Compliance approval for financial activation.

**Evidence retention:** store manifest checksums, reviewer IDs, signed timestamps, deployment ID and redacted status observations in an access-restricted audit store. Customer data, signing keys and provider secrets must never be stored in Pages or public CI artifacts.

**Decision:** verification code produces review evidence only; release remains NO-GO until authenticated deployment bytes and protected hosting are independently confirmed.