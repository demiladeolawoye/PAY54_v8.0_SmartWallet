"use strict";

/**
 * PAY54 Batch 33 - deterministic posted/HELD reservation reconciliation.
 * All inputs are independently trusted accounting snapshots, never client
 * supplied amounts. Pure calculation does not attest PostgreSQL provenance,
 * concurrency, RLS, provider settlement or live spendable funds.
 */
const DENIED="PAY54_WALLET_RECONCILIATION_DENIED";
const DIGITS=/^(0|[1-9][0-9]{0,37})$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fields=["accountId","walletId","currency","postedMinor","heldMinor",
 "postedEntryCount","heldReservationCount","asOfRevision",
 "readOnlyTransaction","actorBoundRls","singleSnapshot"];
const deny=()=>{throw Error(DENIED);};
const exact=o=>o&&typeof o==="object"&&!Array.isArray(o)&&
 (Object.getPrototypeOf(o)===Object.prototype||
  Object.getPrototypeOf(o)===null)&&
 Object.keys(o).length===fields.length&&fields.every(k=>Object.hasOwn(o,k));
export function reconcilePay54WalletBalanceSnapshot(snapshot){
 if(!exact(snapshot)||!UUID.test(snapshot.accountId??"")||
    !UUID.test(snapshot.walletId??"")||
    typeof snapshot.currency!=="string"||
    !/^[A-Z]{3}$/.test(snapshot.currency)||
    typeof snapshot.postedMinor!=="string"||
    typeof snapshot.heldMinor!=="string"||
    !DIGITS.test(snapshot.postedMinor)||
    !DIGITS.test(snapshot.heldMinor)||
    !Number.isSafeInteger(snapshot.postedEntryCount)||
    snapshot.postedEntryCount<0||
    !Number.isSafeInteger(snapshot.heldReservationCount)||
    snapshot.heldReservationCount<0||
    !Number.isSafeInteger(snapshot.asOfRevision)||
    snapshot.asOfRevision<1||
    snapshot.readOnlyTransaction!==true||
    snapshot.actorBoundRls!==true||
    snapshot.singleSnapshot!==true)deny();
 const posted=BigInt(snapshot.postedMinor);
 const held=BigInt(snapshot.heldMinor);
 if(held>posted||
    (snapshot.heldReservationCount===0&&held!==0n)||
    (snapshot.heldReservationCount>0&&held===0n)||
    (snapshot.postedEntryCount===0&&posted!==0n))deny();
 return Object.freeze({
  schema:"pay54.wallet-accounting-reconciliation.v1",
  accountId:snapshot.accountId.toLowerCase(),
  walletId:snapshot.walletId.toLowerCase(),
  currency:snapshot.currency,
  postedMinor:posted.toString(),
  heldMinor:held.toString(),
  computedUnreservedMinor:(posted-held).toString(),
  postedEntryCount:snapshot.postedEntryCount,
  heldReservationCount:snapshot.heldReservationCount,
  asOfRevision:snapshot.asOfRevision,
  reconciliationArithmeticPassed:true,
  financialAuthorityEstablished:false,
  customerAvailableBalanceVerified:false,
  approvedForCustomerDisplay:false,
  productionReady:false,
  financialExecutionAuthorised:false
 });
}
