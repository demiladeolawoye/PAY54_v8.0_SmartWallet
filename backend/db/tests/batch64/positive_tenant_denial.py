#!/usr/bin/env python3
"""PAY54 Wave11: real canonical positive writer plus cross-tenant, overspend denial.
Adds executable negative evidence to Wave7's rollback-only fixture. PostgreSQL
roles/policies/ledger entries are created and ROLLED BACK within that fixture.
"""
from __future__ import annotations
import os
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "batch60" / "001_disposable_restricted_canonical_writer.sql"
ANCHOR = "END $positive$;\nRESET ROLE;"
DENIAL = r"""
DO $wave11$
DECLARE denied boolean;
BEGIN
 denied:=false;
 BEGIN
  PERFORM * FROM pay54.w7_disposable_attested_money(
   decode(repeat('a7',32),'hex'),
   'a6700000-0000-4000-8000-000000000001',1,'RESERVE',
   'a6700000-0000-4000-8000-000000000302',
   'a6700000-0000-4000-8000-000000000201',
   100,'wave11-foreign-source-0001',repeat('c',64),NULL,NULL);
 EXCEPTION WHEN SQLSTATE 'P5403' THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PAY54_W11_FOREIGN_SOURCE_ACCEPTED'; END IF;
 denied:=false;
 BEGIN
  PERFORM * FROM pay54.w7_disposable_attested_money(
   decode(repeat('a7',32),'hex'),
   'a6700000-0000-4000-8000-000000000001',1,'RESERVE',
   'a6700000-0000-4000-8000-000000000301',
   'a6700000-0000-4000-8000-000000000202',
   9000,'wave11-overspend-source-0002',repeat('d',64),NULL,NULL);
 EXCEPTION WHEN SQLSTATE 'P5401' THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PAY54_W11_OVERSPEND_ACCEPTED'; END IF;
 denied:=false;
 BEGIN
  PERFORM * FROM pay54.w7_disposable_attested_money(
   decode(repeat('a7',32),'hex'),
   'a6700000-0000-4000-8000-000000000001',1,'RESERVE',
   'a6700000-0000-4000-8000-000000000301',
   'a6700000-0000-4000-8000-000000000202',
   6000,'wave7-disposable-capture-0001',repeat('e',64),NULL,NULL);
 EXCEPTION WHEN SQLSTATE 'P5402' THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PAY54_W11_IDEMPOTENCY_CONFLICT_ACCEPTED'; END IF;
 denied:=false;
 BEGIN
  PERFORM * FROM pay54.w7_disposable_attested_money(
   decode(repeat('a7',32),'hex'),
   'a6700000-0000-4000-8000-000000000002',1,'RESERVE',
   'a6700000-0000-4000-8000-000000000301',
   'a6700000-0000-4000-8000-000000000202',
   100,'wave11-other-account-0003',repeat('f',64),NULL,NULL);
 EXCEPTION WHEN SQLSTATE 'P5457' THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PAY54_W11_FOREIGN_ACCOUNT_ACCEPTED'; END IF;
 RAISE NOTICE 'PAY54_W11_FOREIGN_OWNER_OVERSPEND_REPLAY_DENIAL_PASS';
END $wave11$;
"""
def main():
    container = os.environ.get("POSTGRES_CONTAINER", "")
    if not container or not container.replace("-", "").replace("_", "").isalnum():
        raise RuntimeError("PAY54_W11_DISPOSABLE_CONTAINER_REQUIRED")
    if os.environ.get("PAY54_ENVIRONMENT", "DISPOSABLE_CI") != "DISPOSABLE_CI":
        raise RuntimeError("PAY54_W11_ENVIRONMENT_DENIED")
    base = SOURCE.read_text(encoding="utf8")
    if base.count(ANCHOR) != 1 or "ROLLBACK;" not in base or "pay54_disposable_ci" not in base:
        raise RuntimeError("PAY54_W11_REVIEWED_FIXTURE_DRIFT")
    sql = base.replace(ANCHOR, "END $positive$;\n" + DENIAL + "\nRESET ROLE;", 1)
    p = subprocess.run(["docker","exec","-i",container,"psql","-X","-U","postgres",
         "-d","pay54_disposable_ci","-v","ON_ERROR_STOP=1"],
         input=sql,text=True,capture_output=True,timeout=90,check=False)
    if p.returncode:
        raise RuntimeError("PAY54_W11_PG_DENIAL_FAILED: " + p.stderr[-2400:])
    if "PAY54_W11_FOREIGN_OWNER_OVERSPEND_REPLAY_DENIAL_PASS" not in p.stderr:
        raise RuntimeError("PAY54_W11_DENIAL_MARKER_MISSING")
    if "PAY54_W7_CANONICAL_RESTRICTED_WRITER_ROLLBACK_PASS" not in p.stdout:
        raise RuntimeError("PAY54_W11_ROLLBACK_MARKER_MISSING")
    print("PAY54_W11_CANONICAL_POSITIVE_TENANT_DENIAL_AND_ROLLBACK_PASS", flush=True)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(str(e),file=sys.stderr)
        sys.exit(1)
