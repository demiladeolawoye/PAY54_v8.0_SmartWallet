"use strict";

/**
 * PAY54 Batch 24 / 940 — uncertain identity-assertion consumption recovery.
 *
 * A lost COMMIT acknowledgement must not cause a second bootstrap token to
 * be issued. This deliberately returns no token, account information or
 * automatic retry permission. Callers must obtain a NEW signed assertion
 * after reauthentication, regardless of the receipt lookup result.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const deny=()=>{throw new Error("PAY54_ASSERTION_RECOVERY_DENIED");};

export async function assessPay54BootstrapRecovery({
  verifiedIdentity,readReceiptFromTrustedStore,getTrustedServerTimeMs=Date.now
}={}){
  if(verifiedIdentity?.schema!=="pay54.verified-identity-access.v1" ||
     verifiedIdentity.cryptographicSignatureVerified!==true ||
     !UUID.test(verifiedIdentity.principalId??"") ||
     !UUID.test(verifiedIdentity.assertionId??"") ||
     typeof verifiedIdentity.issuer!=="string" ||
     typeof readReceiptFromTrustedStore!=="function" ||
     typeof getTrustedServerTimeMs!=="function")deny();
  const now=getTrustedServerTimeMs();
  if(!Number.isSafeInteger(now)||now<=0)deny();
  let receipt;
  try{
    receipt=await readReceiptFromTrustedStore(Object.freeze({
      assertionId:verifiedIdentity.assertionId,
      issuer:verifiedIdentity.issuer
    }));
  }catch{deny();}

  if(receipt!==null){
    if(!receipt||typeof receipt!=="object"||
       receipt.assertionId!==verifiedIdentity.assertionId ||
       receipt.issuer!==verifiedIdentity.issuer ||
       receipt.principalId!==verifiedIdentity.principalId ||
       !UUID.test(receipt.bootstrapSessionId??""))deny();
  }
  return Object.freeze({
    schema:"pay54.bootstrap-uncertain-commit-recovery.v1",
    assertionConsumed:receipt!==null,
    recoveryAction:"REAUTHENTICATE_WITH_NEW_SIGNED_ASSERTION",
    previousCredentialRecoverySupported:false,
    automaticBootstrapRetryAuthorised:false,
    sessionTokenDisclosed:false,
    accountSelectionAuthorised:false,
    moneyMovementAuthorised:false,
    operationalStagingRecoveryStillRequired:true
  });
}
