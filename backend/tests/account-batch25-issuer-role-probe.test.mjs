"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {probePay54StagingIdentityIssuerRole as probe}
 from "../src/postgres-staging-role-probe.mjs";

function fixture({role="pay54_session_issue_role",
 write=false,uncertainRollback=false}={}){
 const calls=[],releases=[];
 return {
  calls,releases,
  async connect(){
   return {
    async query(sql){
     calls.push(sql);
     if(sql==="ROLLBACK" && uncertainRollback)
       throw Error("private-database-rollback");
     if(sql.startsWith("SELECT current_user AS role_name"))
       return {rows:[{
        role_name:role,
        restricted:true,
        may_issue:true,
        may_write_sessions:write,
        may_write_receipts:write,
        may_write_ledger:false
       }]};
     return {rows:[]};
    },
    release(discard=false){releases.push(discard);}
   };
  }
 };
}
test("992: read-only probe validates actual effective bootstrap role without issuing sessions",async()=>{
 const f=fixture();
 const result=await probe({sessionIssuerPool:f});
 assert.equal(result.effectiveFunctionOnlyRoleVerified,true);
 assert.equal(result.accountSessionIssued,false);
 assert.equal(result.productionReleaseAuthorised,false);
 assert.equal(f.calls.at(-1),"COMMIT");
 assert.equal(f.releases[0],false);
 assert.ok(Object.isFrozen(result));
});
test("992: wrong role and direct session/receipt DML are denied",async()=>{
 for(const opts of [{role:"postgres"},{write:true}]){
  const f=fixture(opts);
  await assert.rejects(probe({sessionIssuerPool:f}),
    /STAGING_ROLE_PROBE_DENIED/);
  assert.equal(f.calls.at(-1),"ROLLBACK");
 }
});
test("992: rollback transport uncertainty discards PostgreSQL client",async()=>{
 const f=fixture({role:"postgres",uncertainRollback:true});
 await assert.rejects(probe({sessionIssuerPool:f}),
  /STAGING_ROLE_PROBE_DENIED/);
 assert.deepEqual(f.releases,[true]);
});
