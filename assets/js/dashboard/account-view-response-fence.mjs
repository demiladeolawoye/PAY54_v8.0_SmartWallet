"use strict";

/*
 * PAY54 Batch 12 item 330 — account-scoped UI response fence.
 *
 * Browser-only protection against stale asynchronous account data after a
 * request to change account or on principal/logout change.
 * The backend MUST authenticate and authorise each read separately.
 * A fenced response is not proof of account membership or safe financial data.
 *
 * No token storage, network access, ledger mutation or account authorisation.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESOURCES=Object.freeze(new Set([
 "balance","transactions","cards","recipients","wallets","limits","activity"
]));
const validId=id=>typeof id==="string"&&UUID.test(id);
export function createAccountViewResponseFence(){
 let generation=0;
 let activeAccountId=null;
 let principalEpoch=null;
 const live=new WeakMap();
 const latestRequestByResource=new Map();
 let nextRequestOrdinal=0;
 const assertGeneration=()=>{
  if(!Number.isSafeInteger(generation)||generation===Number.MAX_SAFE_INTEGER){
   throw new Error("PAY54_ACCOUNT_VIEW_EPOCH_EXHAUSTED");
  }
 };
 const invalidate=()=>{
  assertGeneration();
  generation++;
  latestRequestByResource.clear();
  nextRequestOrdinal=0;
  activeAccountId=null;
  principalEpoch=null;
 };
 return Object.freeze({
  onSwitchRequested:invalidate,
  onLogout:invalidate,
  onPrincipalChanged:invalidate,
  onVerificationFailed:invalidate,
  onAccountConfirmed({accountId,principalVersion}={}){
   if(!validId(accountId)||!Number.isSafeInteger(principalVersion)||
      principalVersion<1){
    throw new TypeError("PAY54_ACCOUNT_VIEW_CONFIRMATION_INVALID");
   }
   invalidate();
   activeAccountId=accountId.toLowerCase();
   principalEpoch=principalVersion;
   return Object.freeze({
    selectedAccountId:activeAccountId,
    readPresentationOnly:true,
    financialExecutionEnabled:false,
    membershipIndependentlyVerified:false
   });
  },
  beginRead({accountId,principalVersion,resource}={}){
   if(!activeAccountId||!validId(accountId)||
      accountId.toLowerCase()!==activeAccountId||
      principalVersion!==principalEpoch||!RESOURCES.has(resource)){
    throw new Error("PAY54_ACCOUNT_VIEW_NOT_CURRENT");
   }
   if(!Number.isSafeInteger(nextRequestOrdinal)||
      nextRequestOrdinal===Number.MAX_SAFE_INTEGER){
    throw new Error("PAY54_ACCOUNT_VIEW_REQUEST_EPOCH_EXHAUSTED");
   }
   const ordinal=++nextRequestOrdinal;
   latestRequestByResource.set(resource,ordinal);
   const ticket=Object.freeze({
    accountId:activeAccountId,resource,principalVersion,
    presentationOnly:true,financialExecutionEnabled:false
   });
   live.set(ticket,Object.freeze({generation,ordinal}));
   return ticket;
  },
  acceptResponse(ticket,{accountId,principalVersion,resource}={}){
   const issued=ticket&&typeof ticket==="object"?live.get(ticket):undefined;
   if(issued===undefined){
    throw new Error("PAY54_ACCOUNT_VIEW_TICKET_INVALID");
   }
   live.delete(ticket);
   const accepted=issued.generation===generation&&
    latestRequestByResource.get(ticket.resource)===issued.ordinal&&
    activeAccountId!==null&&
    principalEpoch===principalVersion&&
    accountId===activeAccountId&&ticket.accountId===accountId&&
    ticket.principalVersion===principalVersion&&
    ticket.resource===resource;
   return Object.freeze({
    acceptedForPresentation:accepted,
    financialExecutionEnabled:false,
    serverResponseAuthenticated:false,
    reason:accepted?"FRESH_VIEW_TICKET":"STALE_OR_DIFFERENT_ACCOUNT"
   });
  },
  snapshot(){
   return Object.freeze({
    hasSelectedAccount:activeAccountId!==null,
    selectedAccountId:activeAccountId,
    principalVersion:principalEpoch,
    outstandingDataIsUntrusted:true,
    financialExecutionEnabled:false
   });
  }
 });
}
