"use strict";
/** PAY54 Batch 27 / 1158 — integer-minor-unit balanced settlement evidence. */
const CUR=new Set(["GBP","NGN","USD","EUR","GHS","KES"]);
const deny=()=>{throw Error("PAY54_LEDGER_SETTLEMENT_REVIEW_DENIED");};
export function inspectPay54WalletSettlementEvidence({
 currency,legs,providerReferenceHash
}={}){
 if(!CUR.has(currency)||typeof providerReferenceHash!=="string" ||
    !/^[a-f0-9]{64}$/.test(providerReferenceHash) ||
    !Array.isArray(legs)||legs.length<2||legs.length>200)deny();
 let sum=0n;const refs=new Set();
 for(const leg of legs){
  if(!leg ||typeof leg.accountKey!=="string" ||
     !/^[A-Za-z0-9._:-]{3,96}$/.test(leg.accountKey) ||
     refs.has(leg.accountKey) ||
     typeof leg.deltaMinor!=="string" ||
     !/^-?[0-9]{1,18}$/.test(leg.deltaMinor))deny();
  refs.add(leg.accountKey);
  sum+=BigInt(leg.deltaMinor);
 }
 return Object.freeze({
  schema:"pay54.ledger-settlement-source-conservation.v1",
  currency,legCount:legs.length,
  balancingConservationHolds:sum===0n,
  sourceProviderSettlementIndependentlyConfirmed:false,
  immutableLedgerEntriesActuallyInspected:false,
  realCustomerBalanceUpdated:false,
  moneyExecutionAuthorised:false
 });
}
