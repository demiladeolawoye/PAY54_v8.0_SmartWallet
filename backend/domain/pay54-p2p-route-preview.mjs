"use strict";

/*
 * PAY54 Batch 12 item 326 — trusted-source PAY54-to-PAY54 routing PREVIEW.
 * A shared PAY54 identity never implies that two wallets share a legal entity,
 * safeguarding regime, ledger, currency, or regulated transfer permission.
 * No money movement, mutation, provider dispatch or market enablement.
 */
const COUNTRY=/^[A-Z]{2}$/;
const REVIEWED_MARKETS=new Set([
 "GB","NG","US","DE","FR","NL","ES","IE","CA","AU","SG","AE","JP",
 "KE","GH"
]);
const CURRENCY=/^[A-Z]{3}$/;
const WALLET_ID=/^[a-zA-Z0-9_-]{12,96}$/;
function checkWallet(w){
 if(!w||typeof w!=="object"||Array.isArray(w)||
    typeof w.walletId!=="string"||!WALLET_ID.test(w.walletId)||
    typeof w.country!=="string"||!COUNTRY.test(w.country)||
    !REVIEWED_MARKETS.has(w.country)||
    typeof w.currency!=="string"||!CURRENCY.test(w.currency)||
    typeof w.ledgerDomain!=="string"||!WALLET_ID.test(w.ledgerDomain)||
    typeof w.legalEntity!=="string"||!WALLET_ID.test(w.legalEntity)){
  throw new TypeError("PAY54_P2P_WALLET_CONTEXT_INVALID");
 }
 return w;
}
export function assessPay54TransferRoute({sender,recipient}={}){
 const from=checkWallet(sender),to=checkWallet(recipient);
 if(from.walletId===to.walletId){
  return Object.freeze({
   routeType:"SELF_TRANSFER_INVALID",
   internalLedgerCandidate:false,crossBorder:false,fxRequired:false,
   executable:false,reason:"SAME_WALLET",
   pendingServerAuthorisation:true
  });
 }
 const crossBorder=from.country!==to.country;
 const fxRequired=from.currency!==to.currency;
 const sameEntity=from.legalEntity===to.legalEntity;
 const sameLedger=from.ledgerDomain===to.ledgerDomain;
 const internalLedgerCandidate=!crossBorder&&!fxRequired&&sameEntity&&sameLedger;
 const routeType=internalLedgerCandidate?"SAME_LEDGER_P2P_CANDIDATE":
  crossBorder?"CROSS_BORDER_REGULATED_ROUTING_REQUIRED":
  fxRequired?"FX_SETTLEMENT_REQUIRED":
  "INTER_ENTITY_SETTLEMENT_REQUIRED";
 return Object.freeze({
  routeType,internalLedgerCandidate,crossBorder,fxRequired,
  sameLegalEntity:sameEntity,sameLedgerDomain:sameLedger,
  executable:false,pendingServerAuthorisation:true,
  senderMembershipVerified:false,
  recipientWalletVerified:false,
  regulatedRoutingApproved:false,
  settlementAndSafeguardingAttested:false,
  reason:"SOURCE_ONLY_UNVERIFIED"
 });
}
