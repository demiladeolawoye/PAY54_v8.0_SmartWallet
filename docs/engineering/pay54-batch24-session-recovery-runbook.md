# PAY54 Batch 24 / 963 — Bootstrap and Initial Binding Recovery

**Owner:** Security Operations + DBA + Release Manager.
**State:** Proposed incident procedure, not a successful staging drill.

## Failure classes

**Assertion rejected:** Return a generic authentication refusal with a correlation ID. Never echo token contents, private key IDs, principal, database SQL, or customer account identifiers. Validate issuer trust configuration and clock synchronisation under the Security team's access rules.

**Assertion replay/unique JTI conflict:** Never issue a second session. Inspect the append-only authenticated security event and the trusted assertion receipt under a restricted audit view. If a receipt exists, refuse repeat issuance and send the customer through fresh authentication. If no receipt exists, **still** require a fresh signed assertion rather than replaying the uncertain token.

**Unknown database COMMIT:** Do not return bearer or CSRF credentials. Discard the affected PostgreSQL connection, preserve correlation and transaction outcome evidence, and require independent reauthentication. An orphan bootstrap session, if any, expires in at most five minutes; invoke a privileged incident revocation process when exposure is suspected.

**Initial binding failure:** Because old-session revocation, new account-bound session and account-context audit share one transaction, failure must leave the bootstrap session intact and must not yield an untracked account switch. On a lost COMMIT acknowledgement, suppress newly generated credentials and require reauthentication. Never try a blind repeat of a non-idempotent switch.

**Cross-tenant or privileged-role detection:** Immediately keep account endpoints HTTP 503; isolate compromised session issuers, revoke credentials under approved IAM/DBA authority, suspend provider financial operations as required, preserve audit and begin safeguarding/incident escalation.

## Restore and acceptance

Validate PostgreSQL PITR/backup separately, verify receipt/auth-session/audit referential counts and forced RLS/ACLs, and run negative signed-assertion replay tests with real staging identities. Maintain immutable event logs and do not mutate previously committed audit records. Restore a service only after Security, DBA, Release and Founder approval; production financial permission requires Compliance and partner acceptance too.

**Current operating condition:** No provisioned staging issuer, login service or recovery automation. The foundation's account and money routes remain unavailable.
