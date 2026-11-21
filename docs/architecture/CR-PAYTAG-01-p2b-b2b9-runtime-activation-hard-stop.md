# PAY54 PR #61 — PayTag runtime activation hard stop

This work package follows the verified protected merge of PR #60 at `1d74fcd8ee289a68333dca46ec70ded9353556ca`.

## Scope

A source-only runtime activation assessment, disposable PostgreSQL catalog verification, and regression tests. No migration 029, login, membership, database connection, secret rotation, cloud IAM action, deployment workflow, or environment setting is changed.

The policy cannot return an activation approval. Even an all-true evidence claim yields `runtimeActivationAuthorised: false`, because user-provided booleans do not prove independent evidence. Invalid requests and attempts to activate a persistent environment throw a closed denial.

The catalogue test checks actual role attributes and memberships, definer ownership and pinned search path, no PUBLIC wrapper execution, direct caller DML denial, ledger permission isolation, and FORCE RLS on seven canonical identity/PayTag tables. It does not inspect a real database.

## Required external evidence for a future staging-only change request

1. Independently verified exact SQL SHA-256, change-ticket approval, protected reviewer identity, and the precise target database and principal.
2. A DBA-approved migration-runner identity, pre-migration snapshot, verified point-in-time restore test, schema drift preflight and rollback rehearsal. Database migrations may be irreversible and must not be rolled back by blind DROP or down-migrations.
3. Cloud IAM and database role-graph attestations, secret-manager policy, no plaintext credentials in Actions, secret-rotation drill, network egress restrictions, connection pool role pinning and transaction reset, and authenticated backend admission.
4. Staging-only test corpus with synthetic identities, revoked/rotated sessions, cross-account alias conflict, idempotency mismatch, timeouts, serializable retries, loss of connection after commit and audit reconciliation. Captured logs must not expose token or CSRF digests.
5. Monitoring and incident playbooks: error budgets, privileged role drift alarms, immutable audit monitoring, duplicate request alerting, incident owner and kill switch.
6. Independent change and deployment approvals. Security review of SQL is not permission to deploy it.

## Known design issue requiring further review

Migration 028's definer-owner role has direct privileges on sensitive tables so the invoker writer and trigger chain can run. Its status-filtered RLS policies grant access across eligible rows, not account-specific row policies. Safety depends materially on the fixed trusted writer and isolated owner. Before deployment, examine every executable function granted to that owner, dynamic configuration changes, function replacement privileges, PostgreSQL role inheritance, and connection impersonation paths. Do not describe the owner as having purely row-specific permissions.

The staging deployment preparation workflow remains validation-only and contains no cloud-authentication permission. This PR does not change it.

## Founder/operator responsibilities

No action is needed for the source CI phase. Following a green PR, obtain independent reviewer approval using `milade2705`. Do not supply any database passwords, secrets or service-account keys in chat or in GitHub comments. A future staging proposal will require the actual cloud/database platform administrator and an authorised DBA; neither role nor environment configuration has been verified by this document.

**Production and persistent-staging PayTag activation: NO-GO.**
