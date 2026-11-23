"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createPay54WalletReadTransactionAttestor as make}
 from "../db/wallet-read-transaction-attestor.mjs";
const valid=()=>[
 {role_name:"pay54_wallet_read_caller_role",login_name:"disposable-ci-login",
  read_only:"on",isolation:"repeatable read"},
 {ledger_read:false,reservation_read:false,callable:false}
];
function setup(changes={}){
 const events=[],releases=[];
 const rows=valid();
 if(changes.proof)Object.assign(rows[0],changes.proof);
 if(changes.access)Object.assign(rows[1],changes.access);
 let n=0;
 const client={
  async query(sql){
   events.push(sql);
   if(changes.throwQuery&&sql.includes(changes.throwQuery))
    throw Error("PRIVATE_DATABASE_SECRET");
   if(sql==="BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY"||sql==="ROLLBACK")
    return {rows:[]};
   return {rows:[rows[n++]]};
  },
  release(discard){releases.push(discard);}
 };
 const attestor=make({checkout:async()=>client});
 return {attestor,events,releases};
}
test("read-only caller attestation never authorises money access",async()=>{
 const x=setup();const v=await x.attestor.inspect();
 assert.equal(v.inertAuthorityConfirmed,true);
 assert.equal(v.financialDataReadPermitted,false);
 assert.equal(v.authorisedForCustomerDisplay,false);
 assert.equal(v.productionAuthorised,false);
 assert.deepEqual(x.releases,[true]);
 assert.equal(x.events[0],"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
 assert.equal(x.events.at(-1),"ROLLBACK");
});
for(const [reason,patch] of [
 ["role owner spoof",{proof:{role_name:"postgres"}}],
 ["role is a LOGIN identity",{proof:{login_name:"pay54_wallet_read_caller_role"}}],
 ["read-write tx",{proof:{read_only:"off"}}],
 ["unsafe isolation",{proof:{isolation:"read committed"}}],
 ["direct ledger read",{access:{ledger_read:true}}],
 ["direct hold read",{access:{reservation_read:true}}],
 ["unapproved invocation",{access:{callable:true}}],
 ["db query rejected",{throwQuery:"has_table_privilege"}]
]){
 test("denies "+reason+" and discards connection",async()=>{
  const x=setup(patch);
  await assert.rejects(x.attestor.inspect(),
   e=>e.message==="PAY54_WALLET_READ_TRANSACTION_DENIED");
  assert.deepEqual(x.releases,[true]);
  assert.equal(x.events.at(-1),"ROLLBACK");
 });
}
test("invalid checkout fails closed and does not leak error",async()=>{
 const x=make({checkout:async()=>{throw Error("CLOUD_SECRET");}});
 await assert.rejects(x.inspect(),
  e=>e.message==="PAY54_WALLET_READ_TRANSACTION_DENIED");
});
test("no operational runtime DB is configured by this module",()=>{
 assert.throws(()=>make(),/PAY54_WALLET_READ_TRANSACTION_DENIED/);
});
