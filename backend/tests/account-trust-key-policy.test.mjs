"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync} from "node:crypto";
import {createAccountTrustKeyPolicy} from "../security/account-trust-key-policy.mjs";
const ed=()=>generateKeyPairSync("ed25519").publicKey.export({type:"spki",format:"pem"});
test("only pinned active Ed25519 public keys are accepted",()=>{
 const policy=createAccountTrustKeyPolicy([
  {kid:"a",status:"ACTIVE",publicKeyPem:ed()},
  {kid:"retired",status:"RETIRED",publicKeyPem:ed()}]);
 assert.ok(policy.getActiveKey("a"));
 assert.equal(policy.getActiveKey("retired"),null);
 assert.equal(policy.getActiveKey("missing"),null);
 assert.ok(Object.isFrozen(policy.activeKeyIds));
});
test("invalid key types, duplicate IDs and no active key fail closed",()=>{
 const rsa=generateKeyPairSync("rsa",{modulusLength:2048}).publicKey.export({type:"spki",format:"pem"});
 for(const keys of [
 [],[{kid:"a",status:"ACTIVE",publicKeyPem:rsa}],
 [{kid:"a",status:"RETIRED",publicKeyPem:ed()}],
 [{kid:"a",status:"ACTIVE",publicKeyPem:ed()},{kid:"a",status:"ACTIVE",publicKeyPem:ed()}],
 [{kid:"../../path",status:"ACTIVE",publicKeyPem:ed()}]
 ])assert.throws(()=>createAccountTrustKeyPolicy(keys),TypeError);
});
