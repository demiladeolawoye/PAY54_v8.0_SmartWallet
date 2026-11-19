"use strict";

/**
 * PAY54 Batch 20 / 755 — account selection authorisation boundary.
 *
 * Inputs MUST be loaded by a future trusted backend from an authenticated
 * session and authoritative account/membership store. Never accept records
 * directly from a browser as proof of ownership.
 *
 * An approved selection is only a non-executing proposal. It does not
 * impersonate a principal, update session or tenant context, flush cache,
 * call a money engine or create account privileges.
 */
import {validateAccountDescriptor} from "./account-model.mjs";
import {
  authorizeAccountContext,
  validateAccountMembership
} from "./account-membership.mjs";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const matchesUuid=x=>typeof x==="string"&&UUID.test(x);

export function proposePay54AccountSelection({
  authenticatedPrincipalId,
  requestedAccountId,
  accountFromTrustedStore,
  membershipFromTrustedStore
}={}){
  if(!matchesUuid(authenticatedPrincipalId)||!matchesUuid(requestedAccountId)){
    throw new TypeError("PAY54_ACCOUNT_SELECTION_IDENTITY_REQUIRED");
  }

  let account,membership;
  try{
    account=validateAccountDescriptor(accountFromTrustedStore);
    membership=validateAccountMembership(membershipFromTrustedStore);
  }catch{
    throw new Error("PAY54_ACCOUNT_SELECTION_ACCESS_DENIED");
  }
  if(requestedAccountId.toLowerCase()!==account.accountId||
      !authorizeAccountContext({
        principalId:authenticatedPrincipalId,
        account,membership,operation:"view"
      })){
    throw new Error("PAY54_ACCOUNT_SELECTION_ACCESS_DENIED");
  }

  return Object.freeze({
    schema:"pay54.account-selection-proposal.v1",
    accountId:account.accountId,
    accountType:account.type,
    principalId:authenticatedPrincipalId.toLowerCase(),
    authorisedOperation:"view",
    // A viewer's ability to view is NEVER permission to move money.
    financialOperationAuthorised:false,
    requiresTrustedSessionRebinding:true,
    requiresScopedReadRefresh:true,
    requiresIndependentRlsEnforcement:true,
    browserAccountSwitchCompleted:false,
    productionReady:false
  });
}
