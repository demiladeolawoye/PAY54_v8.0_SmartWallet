"use strict";

/**
 * PAY54 Batch31 — opt-in wallet balance presenter contract.
 *
 * A browser cannot independently authenticate a server simply by inspecting
 * JSON fields. Only an independently configured same-origin authenticated
 * transport may supply results. No fetcher, token storage, route or dashboard
 * DOM mutation is installed by importing this module.
 */
import {createPay54DashboardAccountReadCoordinator}
 from "./account-read-coordinator.mjs";

const DENIED="PAY54_WALLET_PRESENTATION_DENIED";
const deny=()=>{throw Error(DENIED);};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MONEY=/^(0|[1-9][0-9]{0,29})$/;
const allowedKeys=new Set([
 "schema","accountId","walletId","sessionVersion","currency",
 "availableMinor","asOfRevision","displayOnly",
 "backendAuthenticationRequired","dataSourceProvenanceVerifiedByThisModule",
 "financialExecutionAuthorised","productionReady"
]);
function inspectBalance(result,context){
 if(!result||typeof result!=="object"||Array.isArray(result)||
   Object.keys(result).length!==allowedKeys.size||
   Object.keys(result).some(k=>!allowedKeys.has(k))||
   result.schema!=="pay54.account-wallet-balance-read.v1"||
   !UUID.test(result.accountId??"")||!UUID.test(result.walletId??"")||
   result.accountId.toLowerCase()!==context.accountId||
   result.sessionVersion!==context.principalVersion||
   !/^[A-Z]{3}$/.test(result.currency??"")||
   typeof result.availableMinor!=="string"||!MONEY.test(result.availableMinor)||
   !Number.isSafeInteger(result.asOfRevision)||result.asOfRevision<1||
   result.displayOnly!==true||
   result.backendAuthenticationRequired!==true||
   result.dataSourceProvenanceVerifiedByThisModule!==false||
   result.financialExecutionAuthorised!==false||
   result.productionReady!==false)deny();
 return Object.freeze({
  accountId:context.accountId,walletId:result.walletId.toLowerCase(),
  currency:result.currency,availableMinor:result.availableMinor,
  asOfRevision:result.asOfRevision,displayOnly:true,
  financialExecutionAuthorised:false
 });
}
export function createPay54WalletBalancePresenter({
 coordinator=createPay54DashboardAccountReadCoordinator(),
 authenticatedRead,renderBalance,clearBalance
}={}){
 if(typeof authenticatedRead!=="function"||
    typeof renderBalance!=="function"||
    typeof clearBalance!=="function"||
    typeof coordinator?.confirmAccount!=="function"||
    typeof coordinator?.read!=="function")deny();

 const clear=()=>{clearBalance();};
 return Object.freeze({
  confirmFromTrustedAccountSelection({accountId,principalVersion}={}){
   clear();
   try{
    return coordinator.confirmAccount({accountId,principalVersion});
   }catch{deny();}
  },
  async refresh({accountId,principalVersion}={}){
   try{
    return await coordinator.read({
      accountId,principalVersion,resource:"balance",
      load:async({signal})=>{
       // AbortSignal must be honoured by the injected authenticated transport.
       const result=await authenticatedRead(Object.freeze({
         accountId,principalVersion,signal,readOnly:true
       }));
       return inspectBalance(result,{accountId:accountId.toLowerCase(),
         principalVersion});
      },
      render:result=>renderBalance(result)
    });
   }catch{
    // Any failure clears previous potentially stale balance data.
    clear();
    deny();
   }
  },
  onAccountSwitchRequested(){clear();return coordinator.onSwitchRequested();},
  onLogout(){clear();return coordinator.onLogout();},
  onPrincipalChanged(){clear();return coordinator.onPrincipalChanged();},
  onVerificationFailed(){clear();return coordinator.onVerificationFailed();},
  close(){clear();return coordinator.close();}
 });
}
