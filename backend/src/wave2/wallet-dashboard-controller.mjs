"use strict";
/**
 * PAY54 Wave 5 — read-only wallet dashboard controller.
 * Does not bind transfers, change balances or persist credentials.
 * The authenticated backend is the only authoritative balance source.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CURRENCIES=new Set(["NGN","GBP","USD","EUR","GHS","KES"]);
const MAX_MINOR=9223372036854775807n;
const DENIED="Wallet balance unavailable";
function assertConfig(v){
 if(!v||typeof v!=="object"||!UUID.test(v.accountId??"")||
 !UUID.test(v.walletId??"")||!CURRENCIES.has(v.currency))
 throw new TypeError("PAY54_W5_INVALID_WALLET_IDENTITY");
}
function assertWalletModel(payload,config){
 if(!payload||payload.schema!=="pay54.wave2.wallet-read-model.v1"||
 payload.presentationOnly!==true||payload.financialExecutionEnabled!==false||
 !Array.isArray(payload.wallets)||payload.wallets.length!==1)
 throw new Error("PAY54_W5_UNTRUSTED_WALLET_RESPONSE");
 const w=payload.wallets[0];
 if(!w||w.walletId!==config.walletId||w.currency!==config.currency||
 w.canInitiateTransfer!==false)throw new Error("PAY54_W5_UNTRUSTED_WALLET_RESPONSE");
 for(const value of [w.postedMinor,w.heldMinor,w.availableMinor]){
  if(typeof value!=="string"||!/^(0|[1-9][0-9]{0,18})$/.test(value)||
   BigInt(value)>MAX_MINOR)throw new Error("PAY54_W5_INVALID_BALANCE");
 }
 if(BigInt(w.heldMinor)>BigInt(w.postedMinor)||
  BigInt(w.postedMinor)-BigInt(w.heldMinor)!==BigInt(w.availableMinor))
  throw new Error("PAY54_W5_INCONSISTENT_BALANCE");
 return w;
}
export function formatPay54WalletMinor(value,currency){
 if(typeof value!=="string"||!/^(0|[1-9][0-9]{0,18})$/.test(value)||
  BigInt(value)>MAX_MINOR||!CURRENCIES.has(currency))
  throw new TypeError("PAY54_W5_INVALID_MONEY");
 const n=BigInt(value);
 return currency+" "+(n/100n).toString()+"."+(n%100n).toString().padStart(2,"0");
}
export function createPay54WalletDashboard({
 fetchImpl,tokenProvider,documentRef,endpoint="/v1/wallets/read"
}={}){
 if(typeof fetchImpl!=="function"||typeof tokenProvider!=="function"||
 !documentRef||typeof documentRef.createElement!=="function"||
 endpoint!=="/v1/wallets/read")throw new TypeError("PAY54_W5_INVALID_DEPENDENCIES");
 let generation=0;
 function render(mount,{available,held,posted,status}){
  const root=documentRef.createElement("section");
  root.setAttribute("aria-label","PAY54 wallet balance");
  for(const [label,value] of [
   ["Available balance",available],["Pending holds",held],["Posted balance",posted],
   ["Wallet status",status]]){
   const line=documentRef.createElement("p");
   const heading=documentRef.createElement("strong");
   heading.textContent=label+": ";
   const span=documentRef.createElement("span");
   span.textContent=value;
   line.append(heading,span);
   root.append(line);
  }
  const transfer=documentRef.createElement("button");
  transfer.type="button";
  transfer.disabled=true;
  transfer.setAttribute("aria-disabled","true");
  transfer.textContent="Transfers unavailable";
  root.append(transfer);
  mount.replaceChildren(root);
 }
 async function refresh(config,mount){
  assertConfig(config);
  if(!mount||typeof mount.replaceChildren!=="function")
   throw new TypeError("PAY54_W5_INVALID_MOUNT");
  const current=++generation;
  const blank={available:"—",held:"—",posted:"—",status:DENIED};
  render(mount,blank);
  try{
   const token=await tokenProvider();
   if(typeof token!=="string"||!token.startsWith("Bearer ")||
      token.length!==50)throw Error("PAY54_W5_TOKEN_DENIED");
   const query=new URLSearchParams({
    accountId:config.accountId,walletId:config.walletId,currency:config.currency
   });
   const response=await fetchImpl(endpoint+"?"+query.toString(),{
    method:"GET",headers:{authorization:token,accept:"application/json"},
    credentials:"omit",cache:"no-store",redirect:"error"
   });
   if(!response||response.status!==200||typeof response.json!=="function")
    throw Error("PAY54_W5_HTTP_DENIED");
   const model=await response.json();
   const w=assertWalletModel(model,config);
   if(current!==generation)return Object.freeze({status:"STALE_IGNORED"});
   render(mount,{
    available:formatPay54WalletMinor(w.availableMinor,w.currency),
    held:formatPay54WalletMinor(w.heldMinor,w.currency),
    posted:formatPay54WalletMinor(w.postedMinor,w.currency),
    status:"Read-only"
   });
   return Object.freeze({status:"READ_ONLY_RENDERED",moneyMovementEnabled:false});
  }catch{
   if(current===generation)render(mount,blank);
   return Object.freeze({status:"UNAVAILABLE",moneyMovementEnabled:false});
  }
 }
 return Object.freeze({refresh,invalidate(){generation++;}});
}
