"use strict";

import {requireTrustedPrincipal} from "./trusted-account-principal.mjs";
import {calculatePay54BalanceMovement} from "./balance-movement-projection.mjs";

/*
 * PAY54 Batch 12 item 345 — read-only balance movement review boundary.
 * The owner must supply a server-authenticated account reader, a trusted
 * principal resolver and a ledger-snapshot query adapter. Both identity and
 * account eligibility are rechecked after the awaited snapshot query.
 *
 * The resulting calculation is NOT an audited or independently proven ledger
 * statement: real database RLS, TLS, custody and ledger provenance remain
 * separate production release requirements.
 *
 * No HTTP registration, live reads, provider calls, writes or money movement.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CCY=/^[A-Z]{3}$/;
const PERIODS=new Set([7,30,90]);

export function createAccountBalanceMovementReview({
  accountReader,principalResolver,loadSnapshots,
  now=()=>Date.now(),maxReviewMs=2000
}={}){
 if(!accountReader||typeof accountReader.selectForRequest!=="function"||
    !principalResolver||typeof principalResolver.resolve!=="function"||
    typeof loadSnapshots!=="function"||typeof now!=="function"||
    !Number.isSafeInteger(maxReviewMs)||maxReviewMs<100||maxReviewMs>5000){
  throw new TypeError("PAY54_BALANCE_REVIEW_CONFIG_INVALID");
 }
 return Object.freeze({
  async review({request,accountId,currency,periodDays,referenceAsOf}={}){
   if(typeof accountId!=="string"||!UUID.test(accountId)||
      typeof currency!=="string"||!CCY.test(currency)||
      !PERIODS.has(periodDays)||!Number.isSafeInteger(referenceAsOf)||
      referenceAsOf<0){
    throw new Error("PAY54_BALANCE_REVIEW_DENIED");
   }
   const target=accountId.toLowerCase();
   try{
    const started=now();
    if(!Number.isSafeInteger(started)||started<0){
     throw new Error("PAY54_BALANCE_REVIEW_DENIED");
    }
    const firstPrincipal=requireTrustedPrincipal(
      await principalResolver.resolve(request)
    );
    const firstAccount=await accountReader.selectForRequest(request,target);
    if(firstAccount.accountId!==target||
       firstAccount.status!=="ACTIVE"||
       firstAccount.verificationStatus!=="VERIFIED"){
     throw new Error("PAY54_BALANCE_REVIEW_DENIED");
    }
    const pair=await loadSnapshots({
      principalId:firstPrincipal,accountId:target,
      currency,periodDays,referenceAsOf
    });
    if(!pair||typeof pair!=="object"||Array.isArray(pair)){
     throw new Error("PAY54_BALANCE_REVIEW_DENIED");
    }
    const projection=calculatePay54BalanceMovement({
      opening:pair.opening,closing:pair.closing,
      periodDays,referenceAsOf
    });
    if(projection.accountId!==target||projection.currency!==currency){
     throw new Error("PAY54_BALANCE_REVIEW_DENIED");
    }
    // Re-read membership and identity to deny revocation and account
    // replacement during a slow snapshot query. This is not atomic.
    const secondAccount=await accountReader.selectForRequest(request,target);
    const finalPrincipal=requireTrustedPrincipal(
      await principalResolver.resolve(request)
    );
    const completed=now();
    if(firstPrincipal!==finalPrincipal||
       secondAccount.accountId!==target||
       secondAccount.status!=="ACTIVE"||
       secondAccount.verificationStatus!=="VERIFIED"||
       !Number.isSafeInteger(completed)||completed<started||
       completed-started>maxReviewMs){
     throw new Error("PAY54_BALANCE_REVIEW_DENIED");
    }
    return Object.freeze({
      ...projection,
      reviewOnly:true,
      identityRechecked:true,
      accountEligibilityRechecked:true,
      ledgerSnapshotProvenanceAttested:false,
      safeForCustomerBalancePresentation:false,
      operationalDatabaseRlsVerified:false,
      financialExecutionEnabled:false
    });
   }catch{
    throw new Error("PAY54_BALANCE_REVIEW_DENIED");
   }
  }
 });
}
