"use strict";

/* PAY54 Batch 05 — account picker presentation-cache boundary.
 * Stores nonfinancial labels only in memory. Never stores tokens, account
 * balances, cards or a trusted server-side account selection. The cache is
 * invalidated on switch, identity change, logout and verification failure.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createAccountViewCache(){
  let selected=null;
  let labels=Object.freeze([]);
  const reset=()=>{
    selected=null;labels=Object.freeze([]);
  };
  return Object.freeze({
    setDisplayOptions(accounts){
      if(!Array.isArray(accounts)||accounts.length>100)throw new TypeError("ACCOUNT_OPTIONS_INVALID");
      const observed=new Set();
      const next=[];
      for(const item of accounts){
        if(!item||Object.keys(item).sort().join(",")!=="accountId,displayName,type"||
           typeof item.accountId!=="string"||!UUID.test(item.accountId)||
           !["PERSONAL","BUSINESS"].includes(item.type)||
           typeof item.displayName!=="string"||item.displayName.length>120){
          throw new TypeError("ACCOUNT_OPTIONS_INVALID");
        }
        const id=item.accountId.toLowerCase();
        if(observed.has(id))throw new TypeError("ACCOUNT_OPTIONS_INVALID");
        observed.add(id);
        next.push(Object.freeze({accountId:id,type:item.type,displayName:item.displayName}));
      }
      reset();labels=Object.freeze(next);return labels;
    },
    requestSwitch(accountId){
      if(typeof accountId!=="string"||!UUID.test(accountId)||
         !labels.some(x=>x.accountId===accountId.toLowerCase()))throw new Error("ACCOUNT_SWITCH_UNAVAILABLE");
      const requested=accountId.toLowerCase();
      reset();
      return Object.freeze({requestedAccountId:requested,pendingBackendVerification:true,
        effectiveAccountChanged:false,financialExecutionEnabled:false});
    },
    reset,
    onLogout:reset,
    onPrincipalChange:reset,
    onVerificationFailed:reset,
    snapshot(){return Object.freeze({selectedAccountId:selected,accounts:labels,financialExecutionEnabled:false});}
  });
}
