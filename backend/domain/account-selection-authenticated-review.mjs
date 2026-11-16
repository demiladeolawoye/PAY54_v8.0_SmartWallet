"use strict";

import {requireTrustedPrincipal} from "./trusted-account-principal.mjs";
import {projectAccountForSwitcher} from "./account-public-projection.mjs";

/*
 * PAY54 Batch 12 item 341 — authenticated account-selection REVIEW.
 *
 * Uses existing one-use selection intent, authenticated principal resolver,
 * tenant-scoped account reader and minimal public projection. The principal
 * is revalidated AFTER awaiting the account read to catch identity changes.
 *
 * This is an unmounted, read-only review service, not a session switch.
 * No actual server session context changes, RLS grants, customer reads or
 * payments are activated by this source module.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createAuthenticatedAccountSelectionReview({
  selectionPolicy,accountReader,principalResolver,
  now=()=>Date.now(),maxReviewMs=2000
}={}){
 if(!selectionPolicy||typeof selectionPolicy.consume!=="function"||
    !accountReader||typeof accountReader.selectForRequest!=="function"||
    !principalResolver||typeof principalResolver.resolve!=="function"||
    typeof now!=="function"||!Number.isSafeInteger(maxReviewMs)||
    maxReviewMs<100||maxReviewMs>5000){
  throw new TypeError("PAY54_ACCOUNT_SELECTION_REVIEW_CONFIG_INVALID");
 }
 return Object.freeze({
  async review({request,selectionIntent}={}){
   // Consume first: rejected attempts also exhaust a genuine one-use intent.
   let selection;
   try{selection=selectionPolicy.consume(selectionIntent);}
   catch{throw new Error("ACCOUNT_SELECTION_REVIEW_DENIED");}
   const target=selection?.requestedAccountId;
   if(typeof target!=="string"||!UUID.test(target)||
      selection.selectionAuthorised!==false||
      selection.financialExecutionEnabled!==false||
      selection.requiresFreshServerMembershipCheck!==true){
    throw new Error("ACCOUNT_SELECTION_REVIEW_DENIED");
   }
   try{
    const start=now();
    if(!Number.isSafeInteger(start)||start<0){
     throw new Error("ACCOUNT_SELECTION_REVIEW_DENIED");
    }
    const before=requireTrustedPrincipal(await principalResolver.resolve(request));
    const account=await accountReader.selectForRequest(request,target);
    const after=requireTrustedPrincipal(await principalResolver.resolve(request));
    const end=now();
    if(before!==after||!Number.isSafeInteger(end)||end<start||
       end-start>maxReviewMs){
     throw new Error("ACCOUNT_SELECTION_REVIEW_DENIED");
    }
    const projected=projectAccountForSwitcher(account);
    // A membership can be revoked while the first account read is pending.
    // Revalidate it before returning even a display-only account candidate.
    const freshAccount=await accountReader.selectForRequest(request,target);
    const finalPrincipal=requireTrustedPrincipal(
      await principalResolver.resolve(request)
    );
    const finished=now();
    if(projected.accountId!==target.toLowerCase()||
       freshAccount.accountId!==account.accountId||
       freshAccount.type!==account.type||
       freshAccount.legalOwnerId!==account.legalOwnerId||
       freshAccount.status!=="ACTIVE"||
       freshAccount.verificationStatus!=="VERIFIED"||
       finalPrincipal!==before||
       !Number.isSafeInteger(finished)||finished<start||
       finished-start>maxReviewMs){
     throw new Error("ACCOUNT_SELECTION_REVIEW_DENIED");
    }
    return Object.freeze({
     account:projected,
     identityRechecked:true,
     membershipRechecked:true,
     accountReaderAuthorisationRequired:true,
     reviewOnly:true,
     sessionSwitched:false,
     accountContextChanged:false,
     customerDataAccessEnabled:false,
     financialExecutionEnabled:false,
     independentDatabaseRlsAttested:false,
     requiresFreshAuthorisationForEveryRead:true
    });
   }catch{
    // No internal identity or persistence error is disclosed to callers.
    throw new Error("ACCOUNT_SELECTION_REVIEW_DENIED");
   }
  }
 });
}
