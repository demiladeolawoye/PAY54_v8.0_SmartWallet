"use strict";
import {authorizeAccountContext} from "./account-membership.mjs";
/* Role capability is informational only, not financial transaction authority. */
const VIEW=["view"];
const INITIATE=["view","initiate"];
const MANAGE=["view","manage","initiate"];
const APPROVE=["view","manage","initiate","approve"];
export function evaluateAccountCapabilities({principalId,account,membership}){
 let operations=[];
 for(const op of APPROVE){
  if(authorizeAccountContext({principalId,account,membership,operation:op})){
   operations.push(op);
  }
 }
 return Object.freeze({operations:Object.freeze(operations),
  canView:operations.includes("view"),
  mayInitiate:operations.includes("initiate"),
  mayApprove:operations.includes("approve"),
  financialExecutionEnabled:false,sourceOnly:true});
}
