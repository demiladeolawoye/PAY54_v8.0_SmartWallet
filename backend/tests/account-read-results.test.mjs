"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {freezeAccountReadRows} from "../db/account-read-results.mjs";

test("bounded account rows are deeply immutable and preserve values",()=>{
 const result=freezeAccountReadRows({rows:[{account_id:"abc",role:"BUSINESS_VIEWER",status:"ACTIVE",active:true,amount:null}]});
 assert.deepEqual(result.rows,[{account_id:"abc",role:"BUSINESS_VIEWER",status:"ACTIVE",active:true,amount:null}]);
 assert.ok(Object.isFrozen(result));assert.ok(Object.isFrozen(result.rows));
 assert.ok(Object.isFrozen(result.rows[0]));
});
test("oversized, poisoned, nested or unexpected results fail closed",()=>{
 const invalid=[
  null,{}, {rows:[] , other:"ignored", rows2:0},
  {rows:Array.from({length:101},()=>({}))},
  {rows:[null]},{rows:[[]]}, {rows:[{a:{nested:true}}]},
  {rows:[{a:Infinity}]},{rows:[{a:"x".repeat(1025)}]},
  {rows:[{bad_name:"ok","constructor!":"bad"}]},
  {rows:[{...Object.fromEntries(Array.from({length:25},(_,i)=>["field_"+i,i]))}]},
  {rows:[{"__proto__":"some","a":"ok"}]}
 ];
 for(const result of invalid.filter(x=>x===null||!Array.isArray(x?.rows)||x.rows.length>0)){
  assert.throws(()=>freezeAccountReadRows(result),/ACCOUNT_RESULT_UNAVAILABLE/);
 }
});
test("a row containing a dangerous inherited key cannot alter object prototypes",()=>{
 const row=Object.create(null);row["__proto__"]="injected";row.account_id="test";
 assert.throws(()=>freezeAccountReadRows({rows:[row]}),/ACCOUNT_RESULT_UNAVAILABLE/);
 assert.equal({}.polluted,undefined);
});
