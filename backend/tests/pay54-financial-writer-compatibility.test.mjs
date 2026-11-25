"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {examineFinancialWriterCompatibility as examine,FINANCIAL_FUNCTIONS} from "../governance/pay54-financial-writer-compatibility.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const args={
 reserveSql:read("../db/migrations/003_wallet_reservation.sql"),
 captureReleaseSql:read("../db/migrations/004_reservation_lifecycle.sql"),
 forwardSql:read("../db/release/wallet-read-v1-forward-review.sql")
};
test("canonical functions are invoker and FORCE RLS migration is recognized",()=>{
 const r=examine(args);
 assert.equal(r.status,"NO_GO");
 assert.equal(r.findings.filter(x=>x.startsWith("INVOKER_FUNCTION_NOT_PROVEN")).length,0);
 assert.equal(r.findings.filter(x=>x.startsWith("FORCE_RLS_NOT_EVIDENCED")).length,0);
 assert.equal(r.functions.length,FINANCIAL_FUNCTIONS.length);
 assert.equal(r.financialExecutionAuthorized,false);
});
test("changed function security is detected",()=>{
 const r=examine({...args,reserveSql:args.reserveSql.replace("SECURITY INVOKER","SECURITY DEFINER")});
 assert.ok(r.findings.includes("INVOKER_FUNCTION_NOT_PROVEN:reserve_wallet_transfer"));
});
test("every financial function must independently declare invoker security",()=>{
 for(const functionName of FINANCIAL_FUNCTIONS){
  const key="SECURITY INVOKER";
  const altered=functionName==="reserve_wallet_transfer"
   ? {...args,reserveSql:args.reserveSql.replace(key,"SECURITY DEFINER")}
   : {...args,captureReleaseSql:args.captureReleaseSql.replace(
     new RegExp("(CREATE FUNCTION pay54\\."+functionName+"\\([\\s\\S]*?)SECURITY INVOKER","i"),
     "$1SECURITY DEFINER"
    )};
  const result=examine(altered);
  assert.ok(result.findings.includes("INVOKER_FUNCTION_NOT_PROVEN:"+functionName));
  assert.equal(result.financialExecutionAuthorized,false);
 }
});
test("missing forced security is detected",()=>{
 const r=examine({...args,forwardSql:args.forwardSql.replace("ALTER TABLE pay54.ledger_entries FORCE ROW LEVEL SECURITY;","")});
 assert.ok(r.findings.includes("FORCE_RLS_NOT_EVIDENCED:ledger_entries"));
});
test("never authorises even if sources appear sound",()=>{
 const r=examine(args);
 assert.ok(r.findings.includes("EFFECTIVE_NON_SUPERUSER_WRITER_SUCCESS_NOT_PROVEN"));
 assert.equal(r.cloudExecution,false);
 assert.equal(r.managedStagingAuthorized,false);
 assert.equal(r.productionAuthorized,false);
 assert.ok(Object.isFrozen(r));
 assert.throws(()=>examine({}),/PAY54_B46_SOURCE_REQUIRED/);
});
