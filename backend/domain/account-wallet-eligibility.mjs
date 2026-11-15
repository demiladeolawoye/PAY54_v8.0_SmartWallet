"use strict";

/* PAY54 Batch 03: read-only PERSONAL wallet eligibility gate.
 * No balance disclosure, DB writes or financial execution. Authenticated
 * identity and DB row scoping remain mandatory in any future integration. */
import { validateAccountDescriptor } from "./account-model.mjs";
import { authorizeAccountContext } from "./account-membership.mjs";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid=value=>typeof value==="string"&&UUID.test(value);

export function evaluatePersonalWalletAccess({ principalId, account, membership, wallet, binding }) {
  const denied=reason=>Object.freeze({allowed:false,reason,financialExecutionEnabled:false});
  if(!isUuid(principalId))return denied("IDENTITY_REQUIRED");
  let active;
  try{active=validateAccountDescriptor(account);}catch{return denied("INVALID_ACCOUNT");}
  if(active.type!=="PERSONAL")return denied("PERSONAL_ONLY");
  if(!authorizeAccountContext({principalId,account:active,membership,operation:"view"})){
    return denied("ACCOUNT_ACCESS_DENIED");
  }
  if(!wallet||typeof wallet!=="object"||!isUuid(wallet.id)||
     !isUuid(wallet.ownerSubject)||wallet.ownerSubject.toLowerCase()!==active.legalOwnerId||
     wallet.status!=="ACTIVE"){
    return denied("WALLET_UNAVAILABLE");
  }
  if(!binding||typeof binding!=="object"||!isUuid(binding.walletId)||
     !isUuid(binding.accountId)||binding.walletId.toLowerCase()!==wallet.id.toLowerCase()||
     binding.accountId.toLowerCase()!==active.accountId){
    return denied("BINDING_UNAVAILABLE");
  }
  return Object.freeze({allowed:true,reason:"READ_ELIGIBLE_ONLY",
    accountId:active.accountId,walletId:wallet.id.toLowerCase(),financialExecutionEnabled:false});
}
