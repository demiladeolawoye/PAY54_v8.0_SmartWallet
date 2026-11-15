"use strict";
import {authorizeAccountContext} from "./account-membership.mjs";
import {validateAccountDescriptor} from "./account-model.mjs";
/* Server-side per-account disclosure boundary, NOT a financial authorisation. */
export function assertTenantAccountAccess({principalId,account,membership,requestedAccountId}){
 if(typeof requestedAccountId!=="string")throw new Error("ACCOUNT_NOT_AVAILABLE");
 let verified;
 try{verified=validateAccountDescriptor(account);}catch{throw new Error("ACCOUNT_NOT_AVAILABLE");}
 if(verified.accountId!==requestedAccountId.toLowerCase()||
    !authorizeAccountContext({principalId,account:verified,membership,operation:"view"})){
   throw new Error("ACCOUNT_NOT_AVAILABLE");
 }
 return Object.freeze({accountId:verified.accountId,principalId:principalId.toLowerCase(),
  viewEligible:true,financialExecutionEnabled:false});
}
