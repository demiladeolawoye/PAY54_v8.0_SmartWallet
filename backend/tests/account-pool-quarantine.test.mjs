"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountPoolQuarantine} from "../db/account-pool-quarantine.mjs";
test("client is released after verified operation, discarded after operation failure",async()=>{
 const discarded=[];
 const client={query:async()=>({rows:[]}),release:discard=>discarded.push(discard)};
 const gate=createAccountPoolQuarantine({pool:{connect:async()=>client}});
 assert.equal(await gate.withClient(async()=>42),42);
 await assert.rejects(()=>gate.withClient(async()=>{throw Error("FAIL");}),/FAIL/);
 assert.deepEqual(discarded,[false,true]);
});
test("simultaneous use of same client object never permits a second handler",async()=>{
 let unblock;
 const pending=new Promise(resolve=>{unblock=resolve;});
 const client={query:async()=>({rows:[]}),release:()=>{}};
 const gate=createAccountPoolQuarantine({pool:{connect:async()=>client}});
 const first=gate.withClient(async()=>{await pending;return 1;});
 await assert.rejects(()=>gate.withClient(async()=>2),/ACCOUNT_POOL_CLIENT_UNTRUSTED/);
 unblock();assert.equal(await first,1);
});
test("an untrusted pool or malformed callback cannot be used",async()=>{
 assert.throws(()=>createAccountPoolQuarantine({}),TypeError);
 const gate=createAccountPoolQuarantine({pool:{connect:async()=>null}});
 await assert.rejects(()=>gate.withClient(async()=>1),/ACCOUNT_POOL_CLIENT_UNTRUSTED/);
});
