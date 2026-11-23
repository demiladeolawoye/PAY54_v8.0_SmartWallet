-- PAY54 Batch32 — DISPOSABLE ONLY, privileged DB test runner.
-- NO GRANT, SECURITY DEFINER, migration or production SELECT permission.
-- This returns a POSTED ledger net, NOT the spendable/available balance.
-- The trusted server must bind a SHA-256 session token digest as bytea,
-- and UUID account/wallet and three-letter currency as typed parameters.
PREPARE pay54_wallet_posted_net_read(bytea,uuid,uuid,varchar(3)) AS
SELECT s.session_id AS session_id,
       s.session_version AS session_version,
       b.account_id AS account_id,
       b.wallet_id AS wallet_id,
       la.currency::text AS currency,
       COALESCE(SUM(CASE WHEN j.status='POSTED'
                       THEN e.amount_minor::numeric ELSE 0 END),0)::text
         AS posted_net_minor,
       COUNT(e.id) FILTER (WHERE j.status='POSTED')::bigint AS posted_entry_count
FROM pay54.auth_sessions s
JOIN pay54.account_contexts a
  ON a.id=s.active_account_id
JOIN pay54.account_memberships m
  ON m.account_id=a.id AND m.principal_subject=s.principal_id
JOIN pay54.personal_wallet_bindings b ON b.account_id=a.id
JOIN pay54.wallets w ON w.id=b.wallet_id
  AND w.owner_subject=s.principal_id
JOIN pay54.ledger_accounts la ON la.wallet_id=w.id
  AND la.account_class='CUSTOMER_LIABILITY' AND la.status='OPEN'
LEFT JOIN pay54.ledger_entries e
  ON e.account_id=la.id AND e.currency=la.currency
LEFT JOIN pay54.ledger_journals j ON j.id=e.journal_id
WHERE s.token_digest=$1
  AND s.session_status='ACTIVE'
  AND s.expires_at>clock_timestamp()
  AND s.active_account_id=$2
  AND b.wallet_id=$3
  AND la.currency=$4
  AND a.account_type='PERSONAL'
  AND a.status='ACTIVE'
  AND a.verification_status='VERIFIED'
  AND a.legal_owner_subject=s.principal_id
  AND m.role='PERSONAL_OWNER' AND m.status='ACTIVE'
  AND w.status='ACTIVE'
GROUP BY s.session_id,s.session_version,b.account_id,b.wallet_id,la.currency;
