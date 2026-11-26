"use strict";
/**
 * Read-only consumer contract for PAY54 web/mobile integration.
 * No balances are inferred, no pending funds become spendable.
 */
const ISO=/^[A-Z]{3}$/;
const MONEY=/^(0|[1-9][0-9]{0,17})$/;
function record(x){return x!==null&&typeof x==="object"&&!Array.isArray(x);}
export function buildWalletReadModel(payload){
 if(!record(payload)||payload.schema!=="pay54.wallet-read.v1"||
    payload.authoritative!==true||
    !Array.isArray(payload.wallets)||
    payload.wallets.length>12)throw new Error("PAY54_W2_INVALID_WALLET_READ");
 const ids=new Set();
 const wallets=payload.wallets.map(w=>{
  if(!record(w)||typeof w.walletId!=="string"||
   !/^[0-9a-f-]{36}$/.test(w.walletId)||
   ids.has(w.walletId)||!ISO.test(w.currency)||
   !MONEY.test(w.postedMinor)||!MONEY.test(w.heldMinor)||
   w.currency!==w.currency.toUpperCase())throw new Error("PAY54_W2_INVALID_WALLET_ITEM");
  ids.add(w.walletId);
  const posted=BigInt(w.postedMinor),held=BigInt(w.heldMinor);
  if(posted>9223372036854775807n||held>9223372036854775807n)
   throw new Error("PAY54_W2_AMOUNT_OUT_OF_RANGE");
  if(held>posted)throw new Error("PAY54_W2_INCONSISTENT_HOLD");
  return Object.freeze({
   walletId:w.walletId,currency:w.currency,
   postedMinor:w.postedMinor,heldMinor:w.heldMinor,
   availableMinor:(posted-held).toString(),
   canInitiateTransfer:false
  });
 });
 return Object.freeze({
  schema:"pay54.wave2.wallet-read-model.v1",
  wallets:Object.freeze(wallets),
  presentationOnly:true,
  financialExecutionEnabled:false,
  sourceAuthoritative:payload.authoritative
 });
}
