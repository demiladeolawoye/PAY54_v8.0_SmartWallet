"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {webcrypto} from "node:crypto";

const source=readFileSync(
 new URL("../../assets/js/auth.js",import.meta.url),"utf8");

function demo(initial={}){
 const values=new Map(Object.entries(initial));
 const ephemeral=new Map();
 const elements=Object.fromEntries([
  ["signup-name","Example Person"],["signup-email","demo@invalid.example"],
  ["signup-country","+44"],["signup-phone","0000000000"],
  ["signup-pin","4729"],["signup-confirm-pin","4729"],
  ["login-email","demo@invalid.example"],["login-pin","4729"],
  ["forgot-email","demo@invalid.example"],
  ["reset-email","demo@invalid.example"],["reset-pin","5281"],
  ["reset-confirm-pin","5281"],["otp","123456"],
  ["msg",""]
 ].map(([id,value])=>[id,{value,textContent:"",className:""}]));
 const storage=map=>({
  getItem(key){return map.has(key)?map.get(key):null;},
  setItem(key,value){map.set(key,String(value));},
  removeItem(key){map.delete(key);}
 });
 const sandbox={
  window:{crypto:webcrypto,location:{href:""},
   addEventListener(){}},
  localStorage:storage(values),
  sessionStorage:storage(ephemeral),
  document:{
   getElementById(id){return elements[id]??null;},
   querySelector(){return elements["forgot-email"];},
   querySelectorAll(){return Object.values(elements);}
  },
  setTimeout(){},
  TextEncoder,Uint8Array,Date,JSON,Promise,
  console:{error(){}}
 };
 runInNewContext(source,sandbox,{timeout:1000});
 const event={preventDefault(){}};
 return {sandbox,values,ephemeral,elements,event};
}
test("1211: new demo signup stores only salted verifier, no plaintext PIN",async()=>{
 const t=demo();
 await t.sandbox.signup(t.event);
 assert.equal(t.values.has("pay54_pin"),false);
 const record=JSON.parse(t.values.get("pay54_dev_pin_verifier_v2"));
 assert.equal(record.schema,"PAY54-DEV-PIN-VERIFIER-V2");
 assert.equal(record.iterations,310000);
 assert.equal(record.salt.length,32);
 assert.equal(record.verifier.length,64);
 assert.equal(JSON.stringify(record).includes("4729"),false);
 assert.match(t.elements.msg.textContent,/not a real bank account/);
});
test("1211: current demo verifier login keeps old short-lived handoff contract",async()=>{
 const t=demo();
 await t.sandbox.signup(t.event);
 await t.sandbox.login(t.event);
 const h=JSON.parse(t.ephemeral.get("pay54_dev_auth_handoff"));
 assert.equal(h.schema,"PAY54-DEV-AUTH-HANDOFF-V1");
 assert.equal(h.email,"demo@invalid.example");
 assert.equal(h.nonce.length,32);
 assert.ok(h.expiresAt-h.issuedAt<=60000);
 assert.equal(t.values.has("pay54_pin"),false);
 assert.match(t.elements.msg.textContent,/No real account authenticated/);
});
test("1211: incorrect PIN never issues a development auth handoff",async()=>{
 const t=demo();
 await t.sandbox.signup(t.event);
 t.elements["login-pin"].value="0000";
 await t.sandbox.login(t.event);
 assert.equal(t.ephemeral.has("pay54_dev_auth_handoff"),false);
 assert.match(t.elements.msg.textContent,/Invalid demo/);
});
test("1211: legacy plaintext demo PIN migrates only after correct login",async()=>{
 const t=demo({pay54_pin:"4729",pay54_email:"demo@invalid.example"});
 t.elements["login-pin"].value="0000";
 await t.sandbox.login(t.event);
 assert.equal(t.values.get("pay54_pin"),"4729");
 t.elements["login-pin"].value="4729";
 await t.sandbox.login(t.event);
 assert.equal(t.values.has("pay54_pin"),false);
 assert.equal(t.values.has("pay54_dev_pin_verifier_v2"),true);
 assert.equal(t.ephemeral.has("pay54_dev_auth_handoff"),true);
});
test("1211: demo reset rotates verifier without persistent raw PIN",async()=>{
 const t=demo();
 await t.sandbox.signup(t.event);
 const before=t.values.get("pay54_dev_pin_verifier_v2");
 await t.sandbox.savePin(t.event);
 assert.notEqual(t.values.get("pay54_dev_pin_verifier_v2"),before);
 assert.equal(t.values.has("pay54_pin"),false);
 t.elements["login-pin"].value="4729";
 await t.sandbox.login(t.event);
 assert.equal(t.ephemeral.has("pay54_dev_auth_handoff"),false);
 t.elements["login-pin"].value="5281";
 await t.sandbox.login(t.event);
 assert.equal(t.ephemeral.has("pay54_dev_auth_handoff"),true);
});
test("1211: OTP UI explicitly admits no real code has been checked",()=>{
 const t=demo();
 t.sandbox.verifyOtp(t.event);
 assert.match(t.elements.msg.textContent,/No email code was checked/);
});
