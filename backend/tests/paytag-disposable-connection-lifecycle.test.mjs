"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createPay54DisposableConnectionLifecycle as make,
 PAY54_CONNECTION_LIFECYCLE_POSTURE as posture}
 from "../db/paytag-disposable-connection-lifecycle.mjs";

const ONE="ci-gen-0001",TWO="ci-gen-0002",THREE="ci-gen-0003";
function fixture({attestation,acquire}={}){
 const releases=[],calls=[];
 const clients=[];
 const acquireDisposableClient=acquire??(async()=>{
  const client={
   async query(sql){calls.push(sql);return {rows:[]};},
   release(discard){releases.push(discard);}
  };
  clients.push(client);return client;
 });
 const attestDisposableSession=attestation??(async()=>({
  sessionRole:"pay54_paytag_register_role",
  isolation:"serializable",tlsVerified:true,
  roleEscalated:false,financialDmlAccessible:false
 }));
 const life=make({environment:"disposable-test",
  initialGeneration:ONE,acquireDisposableClient,
  attestDisposableSession});
 return {life,releases,calls,clients};
}
test("the module has no live secret, staging or financial powers",()=>{
 assert.ok(Object.isFrozen(posture));
 assert.equal(posture.realSecretManagerConnected,false);
 assert.equal(posture.productionEnabled,false);
 assert.equal(posture.financialExecutionEnabled,false);
});
test("a valid disposable generation checks identity twice and discards connection",async()=>{
 let checked=0;
 const f=fixture({attestation:async()=>{checked++;return {
  sessionRole:"pay54_paytag_register_role",
  isolation:"serializable",tlsVerified:true,
  roleEscalated:false,financialDmlAccessible:false
 };}});
 const result=await f.life.use({expectedGeneration:ONE,
  operation:async client=>{await client.query("SELECT 1");return "ok";}});
 assert.equal(result,"ok");
 assert.equal(checked,2);
 assert.equal(f.calls.length,1);
 assert.deepEqual(f.releases,[true]);
 assert.equal(f.life.snapshot().activeLeases,0);
});
test("rotation retires old epoch without falsely claiming physical revocation",async()=>{
 const f=fixture();
 const rotation=f.life.rotate({fromGeneration:ONE,toGeneration:TWO});
 assert.equal(rotation.connectionsDrained,true);
 assert.equal(rotation.providerCredentialRevoked,false);
 assert.throws(()=>f.life.rotate({fromGeneration:ONE,toGeneration:THREE}),
  /PAY54_PAYTAG_CONNECTION_LIFECYCLE_DENIED/);
 await assert.rejects(f.life.use({expectedGeneration:ONE,
  operation:async()=>1}),/PAY54_PAYTAG_CONNECTION_LIFECYCLE_DENIED/);
 assert.equal(await f.life.use({expectedGeneration:TWO,operation:async()=>2}),2);
 assert.deepEqual(f.releases,[true]);
});
test("unknown, malformed and repeated generation transitions fail closed",()=>{
 const f=fixture();
 for(const x of [{fromGeneration:ONE,toGeneration:ONE},
  {fromGeneration:"invalid",toGeneration:TWO},
  {fromGeneration:ONE,toGeneration:"x"},
  {fromGeneration:ONE,toGeneration:undefined}]){
  assert.throws(()=>f.life.rotate(x),/PAY54_PAYTAG_CONNECTION_LIFECYCLE_DENIED/);
 }
 f.life.rotate({fromGeneration:ONE,toGeneration:TWO});
 assert.throws(()=>f.life.rotate({fromGeneration:TWO,toGeneration:ONE}),
  /PAY54_PAYTAG_CONNECTION_LIFECYCLE_DENIED/);
});
test("rotation cannot overtake an in-flight operation or checkout",async()=>{
 let releaseAcquire;
 const gate=new Promise(resolve=>releaseAcquire=resolve);
 const f=fixture({acquire:async()=>{
  await gate;
  return {query:async()=>({rows:[]}),release:x=>f.releases.push(x)};
 }});
 const pending=f.life.use({expectedGeneration:ONE,operation:async()=>7});
 assert.equal(f.life.snapshot().activeLeases,1);
 assert.throws(()=>f.life.rotate({fromGeneration:ONE,toGeneration:TWO}),
  /PAY54_PAYTAG_CONNECTION_LIFECYCLE_DENIED/);
 releaseAcquire();
 assert.equal(await pending,7);
 assert.deepEqual(f.releases,[true]);
 f.life.rotate({fromGeneration:ONE,toGeneration:TWO});
});
test("failed attestation always quarantines a physical session",async()=>{
 for(const issue of [
  {sessionRole:"postgres"},
  {isolation:"read committed"},
  {tlsVerified:false},
  {roleEscalated:true},
  {financialDmlAccessible:true}
 ]){
  const f=fixture({attestation:async()=>({
   sessionRole:"pay54_paytag_register_role",
   isolation:"serializable",tlsVerified:true,
   roleEscalated:false,financialDmlAccessible:false,...issue
  })});
  await assert.rejects(f.life.use({expectedGeneration:ONE,operation:async()=>1}),
   /PAY54_PAYTAG_CONNECTION_LIFECYCLE_DENIED/);
  assert.deepEqual(f.releases,[true]);
 }
});
test("second attestation detects drift and denies returning a successful result",async()=>{
 let seen=0;
 const f=fixture({attestation:async()=>{
  seen++;
  return {sessionRole:seen===1?"pay54_paytag_register_role":"postgres",
   isolation:"serializable",tlsVerified:true,
   roleEscalated:false,financialDmlAccessible:false};
 }});
 await assert.rejects(f.life.use({expectedGeneration:ONE,operation:async()=>123}),
  /PAY54_PAYTAG_CONNECTION_LIFECYCLE_DENIED/);
 assert.equal(seen,2);
 assert.deepEqual(f.releases,[true]);
});
test("operation errors quarantine and hide raw provider errors",async()=>{
 const f=fixture();
 await assert.rejects(f.life.use({expectedGeneration:ONE,
  operation:async()=>{throw new Error("database-secret-private");}}),
  err=>err.message==="PAY54_PAYTAG_CONNECTION_LIFECYCLE_DENIED");
 assert.deepEqual(f.releases,[true]);
});
test("close during an active lease prevents returning a success receipt",async()=>{
 let resolveOp;
 const op=new Promise(resolve=>resolveOp=resolve);
 const f=fixture();
 const pending=f.life.use({expectedGeneration:ONE,
  operation:async()=>{await op;return "success";}});
 // Wait for the callback to enter without relying on timers.
 for(let i=0;i<20&&f.life.snapshot().activeLeases===0;i++)await Promise.resolve();
 const closed=f.life.close();
 assert.equal(closed.closed,true);
 resolveOp();
 await assert.rejects(pending,/PAY54_PAYTAG_CONNECTION_LIFECYCLE_DENIED/);
 assert.deepEqual(f.releases,[true]);
 assert.equal(f.life.snapshot().activeLeases,0);
 assert.throws(()=>f.life.rotate({fromGeneration:ONE,toGeneration:TWO}),
  /PAY54_PAYTAG_CONNECTION_LIFECYCLE_DENIED/);
});
test("duplicate client handed out concurrently is denied and discarded",async()=>{
 const releases=[];
 const same={query:async()=>({rows:[]}),release:x=>releases.push(x)};
 let resolve;
 const gate=new Promise(r=>resolve=r);
 const f=fixture({acquire:async()=>same});
 const a=f.life.use({expectedGeneration:ONE,operation:async()=>{await gate;return 1;}});
 // Give first lease enough microtasks to be checked out.
 await Promise.resolve();await Promise.resolve();await Promise.resolve();
 const b=f.life.use({expectedGeneration:ONE,operation:async()=>2});
 await assert.rejects(b,/PAY54_PAYTAG_CONNECTION_LIFECYCLE_DENIED/);
 resolve();
 assert.equal(await a,1);
 assert.equal(f.life.snapshot().activeLeases,0);
 assert.ok(releases.every(x=>x===true));
});
test("constructor denies production, missing witnesses and invalid generation",()=>{
 for(const environment of ["production","staging",undefined]){
  assert.throws(()=>make({environment,initialGeneration:ONE,
   acquireDisposableClient:async()=>{},attestDisposableSession:async()=>{}}),
   /PAY54_PAYTAG_CONNECTION_LIFECYCLE_DENIED/);
 }
 assert.throws(()=>make({environment:"disposable-test",initialGeneration:"x",
  acquireDisposableClient:async()=>{},attestDisposableSession:async()=>{}}),
  /PAY54_PAYTAG_CONNECTION_LIFECYCLE_DENIED/);
});
