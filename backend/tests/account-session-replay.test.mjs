"use strict";import test from "node:test";import assert from "node:assert/strict";
import {createAccountSessionReplayPolicy} from "../security/account-session-replay.mjs";
const S="11111111-1111-4111-8111-111111111111",J="22222222-2222-4222-8222-222222222222";
const input={subjectId:S,jti:J,expiresAt:2000};
test("one-use atomic claim cannot be replayed",async()=>{
 const used=new Set();const gate=createAccountSessionReplayPolicy({
  now:()=>1000000,atomicClaim:async({jti})=>{if(used.has(jti))return false;used.add(jti);return true;}
 });
 assert.equal((await gate.consume(input)).accepted,true);
 await assert.rejects(()=>gate.consume(input),/SESSION_REPLAY_DENIED/);
});
test("expired, invalid, unavailable or ambiguous claims deny",async()=>{
 const down=createAccountSessionReplayPolicy({now:()=>1000000,atomicClaim:async()=>{throw Error("offline");}});
 await assert.rejects(()=>down.consume(input),/REPLAY_BACKEND_UNAVAILABLE/);
 const unknown=createAccountSessionReplayPolicy({now:()=>1000000,atomicClaim:async()=>undefined});
 await assert.rejects(()=>unknown.consume(input),/SESSION_REPLAY_DENIED/);
 await assert.rejects(()=>unknown.consume({...input,jti:"bad"}),/SESSION_REPLAY_DENIED/);
});
