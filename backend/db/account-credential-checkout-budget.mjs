"use strict";

import {requireAccountCredentialBinding} from "../security/account-credential-binding.mjs";

/*
 * PAY54 Batch 10 item 242 — source-only/test-only concurrency budget.
 * Limits parallel operations per issued role/tenant credential and explicitly
 * fails closed under overload. Does not create pools, DB users or live access.
 */
export function createAccountCredentialCheckoutBudget({
 maxConcurrentPerRole=2,maxConcurrentTotal=8
}={}){
 if(!Number.isSafeInteger(maxConcurrentPerRole) ||
    maxConcurrentPerRole<1 || maxConcurrentPerRole>16 ||
    !Number.isSafeInteger(maxConcurrentTotal) ||
    maxConcurrentTotal<maxConcurrentPerRole ||
    maxConcurrentTotal>64){
  throw new TypeError("ACCOUNT_CHECKOUT_BUDGET_INVALID");
 }
 const byRole=new Map();
 let activeTotal=0;
 return Object.freeze({
  async execute({binding,callback}){
   const issued=requireAccountCredentialBinding(binding);
   if(issued.environment!=="test" || typeof callback!=="function"){
    throw new Error("ACCOUNT_CHECKOUT_DENIED");
   }
   const key=issued.tenantId+"|"+issued.roleName+"|"+issued.rotationEpoch;
   const count=byRole.get(key)??0;
   if(activeTotal>=maxConcurrentTotal || count>=maxConcurrentPerRole){
    throw new Error("ACCOUNT_CHECKOUT_OVER_CAPACITY");
   }
   byRole.set(key,count+1);
   activeTotal++;
   try {
    return await callback(issued);
   } finally {
    const remaining=(byRole.get(key)??1)-1;
    if(remaining<=0)byRole.delete(key);
    else byRole.set(key,remaining);
    activeTotal--;
   }
  },
  snapshot(){
   return Object.freeze({
    activeTotal,
    activeRoleKeys:byRole.size,
    financialExecutionEnabled:false
   });
  }
 });
}
