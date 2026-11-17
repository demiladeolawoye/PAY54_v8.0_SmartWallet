"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54StagingTlsIdentity as inspect}
 from "../governance/pay54-batch26-tls-identity-policy.mjs";
const x={host:"staging-db.example.internal",
 tlsServerName:"staging-db.example.internal",
 verifyFullCertificateChain:true,allowInsecure:false,encryptedPort:5432};
test("1042: pinned stage DB host enforces full TLS identity but does not connect",()=>{
 const r=inspect(x);
 assert.equal(r.hostnamePinMatches,true);
 assert.equal(r.actualServerCertificateObserved,false);
});
test("1042: insecure override, mismatched hostname and raw IP denied",()=>{
 for(const y of [{allowInsecure:true},
  {tlsServerName:"attacker.internal"},{host:"127.0.0.1"},
  {encryptedPort:0},{verifyFullCertificateChain:false}])
 assert.throws(()=>inspect({...x,...y}),/STAGING_TLS_IDENTITY_DENIED/);
});
