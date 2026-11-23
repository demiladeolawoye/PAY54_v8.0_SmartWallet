-- PAY54 Batch 33: DISPOSABLE ONLY. No new role, grant or migration.
-- Read posted balances and all HELD reservations in one PostgreSQL statement.
-- The query intentionally does not claim spendable customer funds authority.
PREPARE pay54_wallet_reserved_snapshot(bytea,uuid,uuid,varchar(3)) AS
SELECT s.session_id,s.session_version,b.account_id,b.wallet_id,
       la.currency::text AS currency,
       posted.posted_minor::text AS posted_minor,
       held.held_minor::text AS held_minor,
       (posted.posted_minor-held.held_minor)::text AS computed_unreserved_minor,
       posted.posted_entry_count,
       held.held_reservation_count
FROM pay54.auth_sessions s
JOIN pay54.account_contexts a ON a.id=s.active_account_id
JOIN pay54.account_memberships m
 ON m.account_id=a.id AND m.principal_subject=s.principal_id
JOIN pay54.personal_wallet_bindings b ON b.account_id=a.id
JOIN pay54.wallets w ON w.id=b.wallet_id AND w.owner_subject=s.principal_id
JOIN pay54.ledger_accounts la ON la.wallet_id=w.id
 AND la.account_class='CUSTOMER_LIABILITY' AND la.status='OPEN'
CROSS JOIN LATERAL (
 SELECT COALESCE(SUM(e.amount_minor::numeric),0) AS posted_minor,
        COUNT(*)::bigint AS posted_entry_count
 FROM pay54.ledger_entries e
 JOIN pay54.ledger_journals j ON j.id=e.journal_id AND j.status='POSTED'
 WHERE e.account_id=la.id AND e.currency=la.currency
) posted
CROSS JOIN LATERAL (
 SELECT COALESCE(SUM(r.amount_minor::numeric),0) AS held_minor,
        COUNT(*)::bigint AS held_reservation_count
 FROM pay54.balance_reservations r
 WHERE r.account_id=la.id AND r.currency=la.currency AND r.status='HELD'
) held
WHERE s.token_digest=$1
 AND s.session_status='ACTIVE' AND s.expires_at>clock_timestamp()
 AND s.active_account_id=$2 AND b.wallet_id=$3 AND la.currency=$4
 AND a.account_type='PERSONAL' AND a.status='ACTIVE'
 AND a.verification_status='VERIFIED'
 AND a.legal_owner_subject=s.principal_id
 AND m.role='PERSONAL_OWNER' AND m.status='ACTIVE'
 AND w.status='ACTIVE'
 AND posted.posted_minor>=held.held_minor
 AND posted.posted_minor>=0;
