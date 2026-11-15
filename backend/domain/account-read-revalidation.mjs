"use strict";

/* PAY54 Batch 04: read-only lifecycle revalidation on every preview request.
 * This is advisory presentation eligibility, never a financial authorisation.
 * Multiple reads are NOT an atomic ledger-authority snapshot.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUUID=x=>typeof x==="string"&&UUID.test(x);

export function createAccountReadRevalidation({accountReader,walletReader}){
  if(!accountReader||typeof accountReader.selectForRequest!=="function"||
     !walletReader||typeof walletReader.eligibleWalletIds!=="function"){
    throw new TypeError("Trusted read-only account and wallet repositories required");
  }
  return Object.freeze({
    async revalidate({request,accountId,walletId=null}){
      if(!isUUID(accountId) || (walletId!==null&&!isUUID(walletId))){
        throw new Error("INVALID_ACCOUNT_SELECTION");
      }
      const account=await accountReader.selectForRequest(request,accountId);
      if(!account||account.accountId!==accountId.toLowerCase() ||
         account.status!=="ACTIVE"||account.verificationStatus!=="VERIFIED"){
        throw new Error("ACCOUNT_NOT_AVAILABLE");
      }
      if(walletId!==null){
        if(account.type!=="PERSONAL")throw new Error("WALLET_ACCESS_DENIED");
        const walletIds=await walletReader.eligibleWalletIds(request,accountId);
        if(!Array.isArray(walletIds)||!walletIds.includes(walletId.toLowerCase())){
          throw new Error("WALLET_ACCESS_DENIED");
        }
      }
      return Object.freeze({
        accountId:account.accountId,
        walletId:walletId===null?null:walletId.toLowerCase(),
        presentationEligible:true,
        consistency:"NON_ATOMIC_PREVIEW_ONLY",
        transactionAuthorised:false,
        financialExecutionEnabled:false
      });
    }
  });
}
