# PAY54 Batch 26 / 1051 — GitHub Pages Publication Threat Model

**Security classification:** P0 potential exposure review. The repository checkout is not an approved release artifact. An actual public breach is neither proven nor excluded.

## Attack surfaces and trust boundaries

| Surface | Threat | Control implemented in source | Proof still needed |
| --- | --- | --- | --- |
| Repository-root Pages | Backend, SQL, internal documentation exposed to browsers | Batch25 Git-tracked root scanner rejects publication | Authenticated live Pages Settings/source, independent public artifact inventory |
| Build output | Symlink/hardlink to private file, hidden source, secrets or sourcemaps | Batch25 offline static bundle verifier with byte hashes | Independent binary, dependency and secret audit on actual release artifact |
| Deployment metadata | Forged commit, changed custom domain, unverified artifact hash | Batch26 strict source/config structural validator | Authenticated GitHub deployment audit and signed provenance |
| HTTP probing | 200 HTML SPA fallback incorrectly treated as private source | Batch26 content-type/status triage and safe HEAD probe | Authenticated response provenance, byte-level verification with approval |
| Domain/DNS | Unrelated CNAME, certificate downgrade, redirect spoof | Batch26 allowlisted domain evidence | Live DNS/TLS observations from independent reviewer |
| Review statement | Forged reviewer, expired signature, source SHA substitution | Batch26 pinned Ed25519 attestation verification | Trusted reviewer key ownership and independent factual verification |
| Rollback | Unreviewed previous artifact or stale safe baseline | Distinct-source rollback plan with checksummed artifact | Real staged restore drill, reviewer signature, source-to-deployed hash match |
| Development card provider | Public financial UI simulates a successful payment | Actual dashboard source check blocks public financial promotion | Contracted PSP integration, tested funding/ledger compatibility |

## Incident classification

Treat 2xx on a private-looking URL as potential exposure, not conclusive compromise. HTML fallbacks and redirects need careful provenance checks. Where full publicly accessible source bytes are independently matched to private source from the deployment, create a tracked security incident and consider credential revocation, cache invalidation, lawful customer notification and forensic retention under Security/Compliance authority.

**No root publication, production deploy, IAM/secret rotation or financial activation is performed in this batch.**