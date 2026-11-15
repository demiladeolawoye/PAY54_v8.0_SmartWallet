"use strict";

/* PAY54 Batch 05 — unmounted per-instance account-read abuse limiter.
 * Key resolver MUST be server controlled (trusted principal or verified edge
 * source); never consume arbitrary client-provided IP/header values directly.
 * In-memory state is not a distributed production rate limit.
 */
export function createAccountRequestLimiter({
  resolveTrustedClientKey,
  now=()=>Date.now(),
  limit=30,
  windowMs=60_000,
  maxKeys=10_000
}={}){
  if(typeof resolveTrustedClientKey!=="function"||typeof now!=="function"||
     !Number.isSafeInteger(limit)||limit<1||limit>1000||
     !Number.isSafeInteger(windowMs)||windowMs<1000||windowMs>3_600_000||
     !Number.isSafeInteger(maxKeys)||maxKeys<1||maxKeys>100_000){
    throw new TypeError("Account limiter requires bounded server-controlled configuration");
  }
  const state=new Map();
  const prune=timestamp=>{
    for(const [key,value] of state){
      if(value.until<=timestamp)state.delete(key);
    }
  };
  return Object.freeze({
    async consume(request){
      const key=await resolveTrustedClientKey(request);
      if(typeof key!=="string"||key.length<1||key.length>128||
         !/^[a-zA-Z0-9:_-]+$/.test(key)){
        throw new Error("ACCOUNT_RATE_IDENTITY_UNAVAILABLE");
      }
      const timestamp=now();
      if(!Number.isSafeInteger(timestamp))throw new Error("ACCOUNT_RATE_CLOCK_UNAVAILABLE");
      let entry=state.get(key);
      if(entry && (timestamp<entry.started||timestamp>=entry.until)){
        state.delete(key);entry=null;
      }
      if(!entry){
        if(state.size>=maxKeys)prune(timestamp);
        if(state.size>=maxKeys)throw new Error("ACCOUNT_RATE_CAPACITY");
        entry={started:timestamp,until:timestamp+windowMs,count:0};
        state.set(key,entry);
      }
      entry.count++;
      if(entry.count>limit){
        return Object.freeze({allowed:false,reason:"RATE_LIMITED",retryAfterMs:Math.max(0,entry.until-timestamp)});
      }
      return Object.freeze({allowed:true,reason:"WITHIN_LIMIT",retryAfterMs:0});
    }
  });
}
