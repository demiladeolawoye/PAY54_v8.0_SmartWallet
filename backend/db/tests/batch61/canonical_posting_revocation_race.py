#!/usr/bin/env python3
"""PAY54 Wave8: two physical PG16 connections, canonical CAPTURE vs session revoke.
Disposable CI only. No production grants. Every committed synthetic fixture is removed.
"""
from __future__ import annotations
import os
import pathlib
import queue
import subprocess
import sys
import threading
import time

DB = "pay54_disposable_ci"
ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "batch60" / "001_disposable_restricted_canonical_writer.sql"
SESSION = "a6700000-0000-4000-8000-000000000101"
ACCOUNT = "a6700000-0000-4000-8000-000000000001"
SOURCE_ACCOUNT = "a6700000-0000-4000-8000-000000000301"
DEST = "a6700000-0000-4000-8000-000000000202"
OWNER = "a6700000-0000-4000-8000-000000000011"
WRAPPER = "pay54.w7_disposable_attested_money"
CALL = (
    f"{WRAPPER}(decode(repeat('a7',32),'hex'),'{ACCOUNT}'::uuid,1,"
    "'RESERVE',"
    f"'{SOURCE_ACCOUNT}'::uuid,'{DEST}'::uuid,6000,"
    "'wave8-posting-race-0001',repeat('a',64),NULL,NULL)"
)
REVOKE = (f"UPDATE pay54.auth_sessions SET session_status='REVOKED',"
          f"revoked_at=clock_timestamp(),session_version=2 WHERE session_id='{SESSION}'::uuid "
          "AND session_status='ACTIVE' AND session_version=1 /*PAY54_W8_REVOKE*/")
def pg_args():
    container = os.environ.get("POSTGRES_CONTAINER", "")
    if not container or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-" for c in container):
        raise RuntimeError("PAY54_W8_DISPOSABLE_CONTAINER_REQUIRED")
    return ["docker", "exec", "-i", container, "psql", "-X", "-q",
            "-U", "postgres", "-d", DB, "-v", "ON_ERROR_STOP=1", "-A", "-t"]

def execsql(sql: str, timeout: int = 45) -> str:
    done = subprocess.run(pg_args(), input=sql, text=True,
                          capture_output=True, timeout=timeout, check=False)
    if done.returncode:
        raise RuntimeError("PAY54_W8_SQL_ERROR: " + done.stderr[-1400:])
    return done.stdout

class Session:
    def __init__(self):
        self.process = subprocess.Popen(pg_args(), stdin=subprocess.PIPE,
             stdout=subprocess.PIPE, stderr=subprocess.PIPE,
             text=True, bufsize=1)
        self.lines = queue.Queue()
        self.errors = []
        threading.Thread(target=self._read, daemon=True).start()
        threading.Thread(target=self._err, daemon=True).start()
    def _read(self):
        for line in self.process.stdout:
            self.lines.put(line.strip())
    def _err(self):
        for line in self.process.stderr:
            self.errors.append(line.strip())
    def send(self, sql: str):
        if self.process.poll() is not None:
            raise RuntimeError("PAY54_W8_PSQL_EARLY_EXIT")
        self.process.stdin.write(sql + "\n")
        self.process.stdin.flush()
    def until(self, marker: str, timeout: float = 20):
        deadline = time.monotonic() + timeout
        rows = []
        while time.monotonic() < deadline:
            try:
                line = self.lines.get(timeout=min(0.2, max(0.01, deadline-time.monotonic())))
            except queue.Empty:
                continue
            rows.append(line)
            if line == marker:
                if self.errors:
                    raise RuntimeError("PAY54_W8_SESSION_ERROR: " + repr(self.errors))
                return rows
        raise RuntimeError("PAY54_W8_TIMEOUT_" + marker + ": " + repr(rows) + repr(self.errors))
    def close(self):
        if self.process.poll() is None:
            try:
                self.send("ROLLBACK;")
                self.send("\\q")
                self.process.communicate(timeout=3)
            except (BrokenPipeError, subprocess.TimeoutExpired, ValueError):
                self.process.kill()
                self.process.communicate(timeout=3)

CLEAN = r"""
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='5s';
DELETE FROM pay54.outbox_events WHERE aggregate_id IN
 (SELECT id FROM pay54.financial_operations WHERE owner_subject='a6700000-0000-4000-8000-000000000011');
ALTER TABLE pay54.ledger_entries DISABLE TRIGGER USER;
ALTER TABLE pay54.ledger_journals DISABLE TRIGGER USER;
ALTER TABLE pay54.financial_operations DISABLE TRIGGER USER;
DELETE FROM pay54.ledger_entries WHERE journal_id IN
 (SELECT id FROM pay54.ledger_journals
  WHERE operation_id IN (SELECT id FROM pay54.financial_operations
   WHERE owner_subject='a6700000-0000-4000-8000-000000000011'))
 OR journal_id='a6700000-0000-4000-8000-000000000401';
DELETE FROM pay54.ledger_journals WHERE operation_id IN
 (SELECT id FROM pay54.financial_operations WHERE owner_subject='a6700000-0000-4000-8000-000000000011')
 OR id='a6700000-0000-4000-8000-000000000401';
ALTER TABLE pay54.ledger_entries ENABLE TRIGGER USER;
ALTER TABLE pay54.ledger_journals ENABLE TRIGGER USER;
DELETE FROM pay54.idempotency_records WHERE owner_subject='a6700000-0000-4000-8000-000000000011';
DELETE FROM pay54.balance_reservations WHERE account_id='a6700000-0000-4000-8000-000000000301';
DELETE FROM pay54.financial_operations WHERE owner_subject='a6700000-0000-4000-8000-000000000011';
ALTER TABLE pay54.financial_operations ENABLE TRIGGER USER;
DELETE FROM pay54.ledger_accounts WHERE id IN
 ('a6700000-0000-4000-8000-000000000301','a6700000-0000-4000-8000-000000000302',
  'a6700000-0000-4000-8000-000000000303');
DELETE FROM pay54.wallets WHERE id IN
 ('a6700000-0000-4000-8000-000000000201','a6700000-0000-4000-8000-000000000202');
DELETE FROM pay54.auth_sessions WHERE session_id='a6700000-0000-4000-8000-000000000101';
DELETE FROM pay54.account_memberships WHERE account_id='a6700000-0000-4000-8000-000000000001';
DELETE FROM pay54.account_contexts WHERE id='a6700000-0000-4000-8000-000000000001';
UPDATE pay54.currencies SET active=FALSE WHERE code='NGN';
DROP POLICY IF EXISTS pay54_w7_session_select ON pay54.auth_sessions;
DROP POLICY IF EXISTS pay54_w7_session_update ON pay54.auth_sessions;
DROP POLICY IF EXISTS pay54_w7_account ON pay54.account_contexts;
DROP POLICY IF EXISTS pay54_w7_membership ON pay54.account_memberships;
DROP POLICY IF EXISTS pay54_w7_wallets ON pay54.wallets;
DROP POLICY IF EXISTS pay54_w7_accounts ON pay54.ledger_accounts;
DROP POLICY IF EXISTS pay54_w7_entries ON pay54.ledger_entries;
DROP POLICY IF EXISTS pay54_w7_journals ON pay54.ledger_journals;
DROP POLICY IF EXISTS pay54_w7_holds ON pay54.balance_reservations;
DROP OWNED BY pay54_w7_disposable_caller;
DROP OWNED BY pay54_w7_disposable_owner;
DROP ROLE pay54_w7_disposable_caller;
DROP ROLE pay54_w7_disposable_owner;
COMMIT;
DO $verify$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN
  ('pay54_w7_disposable_owner','pay54_w7_disposable_caller'))
 OR to_regprocedure('pay54.w7_disposable_attested_money(bytea,uuid,bigint,text,uuid,uuid,bigint,text,text,uuid,text)') IS NOT NULL
 OR EXISTS (SELECT 1 FROM pg_policies WHERE policyname LIKE 'pay54_w7_%')
 OR EXISTS (SELECT 1 FROM pay54.auth_sessions WHERE session_id='a6700000-0000-4000-8000-000000000101')
 OR EXISTS (SELECT 1 FROM pay54.financial_operations
   WHERE owner_subject='a6700000-0000-4000-8000-000000000011')
 THEN RAISE EXCEPTION 'PAY54_W8_CLEANUP_INCOMPLETE'; END IF;
END $verify$;
"""
def main():
    if not SOURCE.is_file():
        raise RuntimeError("PAY54_W8_REVIEWED_WAVE7_SOURCE_MISSING")
    source = SOURCE.read_text()
    split = "SET LOCAL ROLE pay54_w7_disposable_caller;"
    if source.count(split) != 1 or "ROLLBACK;" not in source:
        raise RuntimeError("PAY54_W8_WAVE7_SOURCE_DRIFT")
    setup = source.split(split, 1)[0] + "\nCOMMIT;\n"
    # Wave7 DDL/fixture SQL is identical to the already accepted rollback-only
    # positive proof. Here we COMMIT it only in the isolated disposable database
    # so that separate physical connections can observe and lock its rows.
    left, right = None, None
    setup_ok = False
    try:
        execsql(setup, 60)
        setup_ok = True
        left, right = Session(), Session()
        left.send("BEGIN; SET LOCAL ROLE pay54_w7_disposable_caller;")
        left.send("SELECT operation_id,outcome FROM " + CALL + ";")
        left.send("\\echo PAY54_W8_RESERVED")
        reserved = left.until("PAY54_W8_RESERVED")
        operation = [x.split("|")[0] for x in reserved if "|CREATED" in x]
        if len(operation) != 1:
            raise RuntimeError("PAY54_W8_RESERVATION_NOT_CREATED: " + repr(reserved))
        left.send(f"SELECT outcome FROM {WRAPPER}(decode(repeat('a7',32),'hex'),'{ACCOUNT}'::uuid,1,'CAPTURE',"
                  f"NULL,NULL,NULL,NULL,NULL,'{operation[0]}'::uuid,NULL);")
        left.send("\\echo PAY54_W8_CAPTURED")
        capture = left.until("PAY54_W8_CAPTURED")
        if "CAPTURED" not in capture:
            raise RuntimeError("PAY54_W8_CANONICAL_CAPTURE_FAILED: " + repr(capture))
        right.send("BEGIN;")
        right.send(REVOKE + ";")
        right.send("\\echo PAY54_W8_REVOKED")
        waiting = False
        for _ in range(30):
            count = execsql(
                "SELECT count(*) FROM pg_stat_activity "
                "WHERE datname=current_database() AND wait_event_type='Lock' "
                "AND query LIKE '%PAY54_W8_REVOKE%' AND pid<>pg_backend_pid();", 10)
            if count.strip().splitlines()[-1:] == ["1"]:
                waiting = True
                break
            time.sleep(0.2)
        if not waiting:
            raise RuntimeError("PAY54_W8_REVOKER_NOT_BLOCKED_BY_FINANCIAL_SESSION_LOCK")
        left.send("COMMIT;")
        left.send("\\echo PAY54_W8_WRITER_COMMITTED")
        left.until("PAY54_W8_WRITER_COMMITTED")
        result = right.until("PAY54_W8_REVOKED")
        if right.errors:
            raise RuntimeError("PAY54_W8_REVOKER_FAILED: " + repr(result))
        right.send("COMMIT;")
        right.send("\\echo PAY54_W8_REVOCATION_COMMITTED")
        right.until("PAY54_W8_REVOCATION_COMMITTED")
        # The next transaction can no longer reserve from a revoked session.
        left.send("BEGIN; SET LOCAL ROLE pay54_w7_disposable_caller;")
        left.send("DO $denied$ BEGIN BEGIN "
                  f"PERFORM * FROM {WRAPPER}(decode(repeat('a7',32),'hex'),'{ACCOUNT}'::uuid,1,"
                  f"'RESERVE','{SOURCE_ACCOUNT}'::uuid,'{DEST}'::uuid,100,"
                  "'wave8-postrevocation-0002',repeat('b',64),NULL,NULL); "
                  "RAISE EXCEPTION 'PAY54_W8_REVOKED_WRITER_ACCEPTED'; "
                  "EXCEPTION WHEN SQLSTATE 'P5457' THEN NULL; END; END $denied$;")
        left.send("ROLLBACK;")
        left.send("\\echo PAY54_W8_POST_REVOKE_DENIED")
        left.until("PAY54_W8_POST_REVOKE_DENIED")
        check = execsql(
            "DO $v$ BEGIN "
            f"IF NOT EXISTS(SELECT 1 FROM pay54.auth_sessions WHERE session_id='{SESSION}' "
            "AND session_status='REVOKED' AND session_version=2) "
            "OR (SELECT count(*) FROM pay54.ledger_journals WHERE journal_type='TRANSFER' "
            "AND status='POSTED' AND operation_id IN "
            f"(SELECT id FROM pay54.financial_operations WHERE owner_subject='{OWNER}'))<>1 "
            "THEN RAISE EXCEPTION 'PAY54_W8_POSTING_OR_REVOCATION_INVARIANT'; END IF; "
            "END $v$;")
        print("PAY54_W8_TWO_PHYSICAL_SESSIONS_CANONICAL_POSTING_VS_REVOCATION_PASS", flush=True)
    finally:
        for session in (left, right):
            if session:
                session.close()
        if setup_ok:
            execsql(CLEAN, 60)
            print("PAY54_W8_COMMITTED_DISPOSABLE_FIXTURES_CLEANED_PASS", flush=True)

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("PAY54_W8_FAIL: " + str(exc), file=sys.stderr)
        sys.exit(1)
