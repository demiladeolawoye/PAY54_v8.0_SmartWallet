"use strict";

/**
 * PAY54 Batch31 — composable server-side wallet balance read boundary.
 *
 * This unmounted service uses trusted injected authority and a separately
 * approved, RLS-bound READ ONLY data reader. It does NOT install a route,
 * connect to a database, or approve a live wallet balance.
 */
import {planPay54AccountWalletRead}
 from "../domain/account-wallet-read-admission.mjs";
import {validatePay54AccountReadContinuity}
 from "../domain/account-read-continuity.mjs";

const DENIED="PAY54_WALLET_BALANCE_READ_UNAVAILABLE";
const deny=()=>{throw new Error(DENIED);};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MONEY=/^(0|[1-9][0-9]{0,29})$/;
const CURRENCY=/^[A-Z]{3}$/;

const exact=(v,keys)=>v!==null&&typeof v==="object"&&!Array.isArray(v)&&
 (Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null)&&
 Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));

function validateReadRows(rows,admission){
 if(!Array.isArray(rows)||rows.length!==1)deny();
 const row=rows[0];
 if(!exact(row,["accountId","walletId","currency","availableMinor","asOfRevision"]))deny();
 if(!UUID.test(row.accountId??"")||!UUID.test(row.walletId??"")||
    row.accountId.toLowerCase()!==admission.accountId||
    row.walletId.toLowerCase()!==admission.walletId||
    !CURRENCY.test(row.currency??"")||
    typeof row.availableMinor!=="string"||!MONEY.test(row.availableMinor)||
    !Number.isSafeInteger(row.asOfRevision)||row.asOfRevision<1)deny();
 return Object.freeze({accountId:admission.accountId,walletId:admission.walletId,
  currency:row.currency,availableMinor:row.availableMinor,
  asOfRevision:row.asOfRevision});
}

/**
 * authority.snapshot(request) returns ONLY trusted session/account/membership/
 * wallet/journal records plus serverTimeMs, NEVER browser-supplied context.
 * storage.readBalance is required to enforce actor-bound PostgreSQL RLS and
 * READ ONLY isolation independently. Its provenance flags are not DB proof.
 */
export function createPay54AuthenticatedWalletBalanceRead({
 authority,storage
}={}){
 if(typeof authority?.snapshot!=="function"||
    typeof storage?.readBalance!=="function")deny();
 return Object.freeze({
  async read({request,requestedAccountId}={}){
   if(typeof requestedAccountId!=="string"||!UUID.test(requestedAccountId))deny();
   let first,last,initial,final,balance;
   try{
    first=await authority.snapshot(request);
    initial=planPay54AccountWalletRead(first);
    if(initial.accountId!==requestedAccountId.toLowerCase())deny();
    const result=await storage.readBalance(Object.freeze({
      principalId:initial.principalId,accountId:initial.accountId,
      walletId:initial.walletId,sessionId:initial.sessionId,
      sessionVersion:initial.sessionVersion,
      readOnly:true,requiresRlsBoundRead:true
    }));
    if(!result||result.readOnlyTransaction!==true||
       result.actorBoundRls!==true)deny();
    balance=validateReadRows(result.rows,initial);
    last=await authority.snapshot(request);
    final=planPay54AccountWalletRead(last);
    validatePay54AccountReadContinuity({
      initialSession:first.sessionFromTrustedAuthority,
      latestSession:last.sessionFromTrustedAuthority,
      initialServerTimeMs:first.serverTimeMs,
      latestServerTimeMs:last.serverTimeMs
    });
    if(final.principalId!==initial.principalId||
       final.accountId!==initial.accountId||
       final.walletId!==initial.walletId||
       final.journalId!==initial.journalId||
       final.sessionVersion!==initial.sessionVersion)deny();
    return Object.freeze({
      schema:"pay54.account-wallet-balance-read.v1",
      accountId:initial.accountId,walletId:initial.walletId,
      sessionVersion:initial.sessionVersion,
      currency:balance.currency,availableMinor:balance.availableMinor,
      asOfRevision:balance.asOfRevision,displayOnly:true,
      backendAuthenticationRequired:true,
      dataSourceProvenanceVerifiedByThisModule:false,
      financialExecutionAuthorised:false,
      productionReady:false
    });
   }catch{deny();}
  }
 });
}
