"use strict";

/* Read-only account permission assessment. No payment or approval function
 * executes based on this policy: financial execution remains disabled.
 * Approvals require a distinct maker/checker transaction record in future.
 */
import { authorizeAccountContext } from "./account-membership.mjs";

const OPERATIONS=Object.freeze(["view","manage","initiate","approve"]);

export function assessAccountOperation({principalId,account,membership,operation,initiatorId=null}) {
  if(!OPERATIONS.includes(operation))return Object.freeze({permitted:false,reason:"UNKNOWN_OPERATION",executionEnabled:false});
  if(!authorizeAccountContext({principalId,account,membership,operation})){
    return Object.freeze({permitted:false,reason:"ACCOUNT_ACCESS_DENIED",executionEnabled:false});
  }
  if(operation==="approve" && initiatorId!==null &&
     typeof initiatorId==="string" && initiatorId.toLowerCase()===principalId.toLowerCase()){
    return Object.freeze({permitted:false,reason:"MAKER_CHECKER_CONFLICT",executionEnabled:false});
  }
  if(operation==="approve" && initiatorId===null){
    return Object.freeze({permitted:false,reason:"MAKER_ID_REQUIRED",executionEnabled:false});
  }
  return Object.freeze({permitted:true,reason:"POLICY_ELIGIBLE_ONLY",executionEnabled:false});
}
