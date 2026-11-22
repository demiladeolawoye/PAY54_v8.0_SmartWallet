"use strict";

/**
 * PAY54 Dashboard — account-scoped, cancellable read coordination.
 *
 * Presentation-only. Independent backend authentication, tenant membership,
 * data minimisation and financial authority must be enforced server-side.
 * No network endpoint, login, wallet mutation or payment action is installed.
 */
import {createAccountViewResponseFence}
 from "./account-view-response-fence.mjs";

const DENIED="PAY54_DASHBOARD_ACCOUNT_READ_DENIED";
const deny=()=>{throw new Error(DENIED);};
const RESOURCES=new Set([
 "balance","transactions","cards","recipients","wallets","limits","activity"
]);

export function createPay54DashboardAccountReadCoordinator({
 responseFence=createAccountViewResponseFence()
}={}){
 if(!responseFence ||
   typeof responseFence.beginRead!=="function" ||
   typeof responseFence.acceptResponse!=="function" ||
   typeof responseFence.onSwitchRequested!=="function" ||
   typeof responseFence.onAccountConfirmed!=="function" ||
   typeof responseFence.onLogout!=="function" ||
   typeof responseFence.onPrincipalChanged!=="function" ||
   typeof responseFence.onVerificationFailed!=="function")deny();

 const inFlight=new Set();
 let selected=null,principalVersion=null,closed=false;

 const cancelPending=()=>{
  for(const entry of inFlight)entry.controller.abort();
  inFlight.clear();
 };
 const invalidate=event=>{
  if(closed)deny();
  cancelPending();
  selected=null;
  principalVersion=null;
  responseFence[event]();
  return Object.freeze({presentationCleared:true,
   financialExecutionEnabled:false,accountConfirmed:false});
 };

 return Object.freeze({
  onSwitchRequested:()=>invalidate("onSwitchRequested"),
  onLogout:()=>invalidate("onLogout"),
  onPrincipalChanged:()=>invalidate("onPrincipalChanged"),
  onVerificationFailed:()=>invalidate("onVerificationFailed"),
  confirmAccount({accountId,principalVersion:version}={}){
   if(closed)deny();
   cancelPending();
   // Do not retain a requested account ID if fence validation fails.
   selected=null;
   principalVersion=null;
   const state=responseFence.onAccountConfirmed({
    accountId,principalVersion:version
   });
   selected=state.selectedAccountId;
   principalVersion=version;
   return Object.freeze({accountId:selected,principalVersion,
    presentationOnly:true,backendMembershipVerifiedByCoordinator:false,
    financialExecutionEnabled:false});
  },
  async read({accountId,principalVersion:version,resource,
    load,render}={}){
   if(closed||selected===null||typeof accountId!=="string"||
      accountId.toLowerCase()!==selected||
      version!==principalVersion||!RESOURCES.has(resource)||
      typeof load!=="function"||typeof render!=="function")deny();

   const ticket=responseFence.beginRead({
    accountId:selected,principalVersion:version,resource
   });
   // Cancel an older read for this resource but leave unrelated cards alive.
   for(const entry of inFlight)
    if(entry.resource===resource)entry.controller.abort();
   const controller=new AbortController();
   const entry={resource,controller};
   inFlight.add(entry);
   let data;
   try{
    data=await load(Object.freeze({
     accountId:selected,principalVersion:version,resource,
     signal:controller.signal,readOnly:true
    }));
    // A fetcher may ignore abort. Never use its late result.
    if(closed||controller.signal.aborted)return Object.freeze({
      status:"STALE",rendered:false,financialExecutionEnabled:false
    });
    const accepted=responseFence.acceptResponse(ticket,{
     accountId:selected,principalVersion:version,resource
    });
    if(!accepted.acceptedForPresentation||controller.signal.aborted||closed)
      return Object.freeze({
       status:"STALE",rendered:false,financialExecutionEnabled:false
      });

    // Render is deliberately synchronous: application must never await
    // asynchronous work here that can outlive an account context.
    const result=render(data,Object.freeze({
      accountId:selected,resource,presentationOnly:true
    }));
    if(result&&typeof result.then==="function")deny();
    return Object.freeze({
     status:"RENDERED",rendered:true,financialExecutionEnabled:false
    });
   }catch(error){
    if(controller.signal.aborted||closed)return Object.freeze({
      status:"STALE",rendered:false,financialExecutionEnabled:false
    });
    // Do not disclose untrusted server errors, account data or credentials.
    deny();
   }finally{
    inFlight.delete(entry);
    data=undefined;
   }
  },
  close(){
   if(!closed){
    cancelPending();
    selected=null;
    principalVersion=null;
    responseFence.onLogout();
    closed=true;
   }
   return Object.freeze({closed:true,financialExecutionEnabled:false});
  },
  snapshot:()=>Object.freeze({
    selectedAccountId:selected,principalVersion,
    activeReadCount:inFlight.size,closed,
    backendMembershipVerifiedByCoordinator:false,
    financialExecutionEnabled:false
  })
 });
}
