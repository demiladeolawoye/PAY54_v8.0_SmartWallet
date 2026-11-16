"use strict";

/*
 * PAY54 Batch 12 item 319 — pure balance-movement projection.
 * Does not fetch balances, validate a remote audit signature or issue a
 * financial attestation. Caller must independently authenticate and
 * reconcile both snapshots before presenting this result as verified.
 * Inputs are signed, base-10 integer MINOR UNITS, never JS currency floats.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MINOR=/^-?(?:0|[1-9][0-9]{0,38})$/;
const PERIODS=Object.freeze([7,30,90]);
function parseSnapshot(s){
 if(!s||typeof s!=="object"||Array.isArray(s)||
   typeof s.accountId!=="string"||!UUID.test(s.accountId)||
   typeof s.currency!=="string"||!/^[A-Z]{3}$/.test(s.currency)||
   !Number.isSafeInteger(s.asOf)||s.asOf<0||
   typeof s.minorUnits!=="string"||!MINOR.test(s.minorUnits)){
  throw new TypeError("PAY54_BALANCE_SNAPSHOT_INVALID");
 }
 return Object.freeze({
  accountId:s.accountId.toLowerCase(),currency:s.currency,
  asOf:s.asOf,minorUnits:BigInt(s.minorUnits)
 });
}
export function calculatePay54BalanceMovement({
 opening,closing,periodDays,referenceAsOf
}={}){
 if(!PERIODS.includes(periodDays)||!Number.isSafeInteger(referenceAsOf)||
    referenceAsOf<0){
  throw new TypeError("PAY54_BALANCE_PERIOD_INVALID");
 }
 const a=parseSnapshot(opening),b=parseSnapshot(closing);
 const periodMs=periodDays*86400000;
 if(a.accountId!==b.accountId||a.currency!==b.currency||
    a.asOf>=b.asOf||b.asOf!==referenceAsOf||
    b.asOf-a.asOf!==periodMs){
  throw new Error("PAY54_BALANCE_SNAPSHOT_SCOPE_MISMATCH");
 }
 const change=b.minorUnits-a.minorUnits;
 const pctBasisPoints=a.minorUnits>0n?
   (change*10000n)/a.minorUnits:null;
 return Object.freeze({
  accountId:a.accountId,currency:a.currency,periodDays,
  openingMinorUnits:String(a.minorUnits),
  closingMinorUnits:String(b.minorUnits),
  changeMinorUnits:String(change),
  direction:change>0n?"INCREASE":change<0n?"DECREASE":"UNCHANGED",
  percentBasisPoints:pctBasisPoints===null?null:String(pctBasisPoints),
  zeroOpeningBalance:a.minorUnits===0n,
  openingAsOf:a.asOf,closingAsOf:b.asOf,
  sourceSnapshotProvenanceVerified:false,
  independentlyAttested:false,
  financialExecutionEnabled:false
 });
}
export function unavailablePay54BalanceMovement(periodDays=30){
 if(!PERIODS.includes(periodDays))throw new TypeError("PAY54_BALANCE_PERIOD_INVALID");
 return Object.freeze({
  periodDays,status:"UNAVAILABLE",
  reason:"VERIFIED_OPENING_AND_CLOSING_LEDGER_SNAPSHOTS_REQUIRED",
  movementAmount:null,percentage:null,
  financialExecutionEnabled:false
 });
}
