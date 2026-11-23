"use strict";
import {extractPay54BearerCredential,digestPay54BearerToken}
 from "./postgres-session-resolver.mjs";

/**
 * PAY54 Batch36: unmounted trusted bridge between authenticated session
 * resolution and a restricted SQL accounting reader.
 *
 * The server MUST supply a reviewed RLS-bound wallet scope resolver. No
 * account/wallet/principal from the request body or browser is trusted.
 * A post-read session check refuses stale results after logout, account
 * switching, session rotation or membership/wallet-binding changes.
 */
const DENIED="PAY54_AUTHENTICATED_ACCOUNTING_UNAVAILABLE";
const reject=()=>{throw Error(DENIED);};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fields=["sessionId","principalId","activeAccountId","version","status"];
function validSession(x){
 return x&&typeof x==="object"&&!Array.isArray(x)&&
  fields.every(k=>Object.hasOwn(x,k))&&
  UUID.test(x.sessionId??"")&&UUID.test(x.principalId??"")&&
  UUID.test(x.activeAccountId??"")&&
  x.status==="ACTIVE"&&Number.isSafeInteger(x.version)&&x.version>0;
}
function equalSession(a,b){
 return b.sessionId===a.sessionId&&b.principalId===a.principalId&&
  b.activeAccountId===a.activeAccountId&&b.version===a.version;
}
function validScope(scope,session){
 return scope&&typeof scope==="object"&&!Array.isArray(scope)&&
  UUID.test(scope.walletId??"")&&/^[A-Z]{3}$/.test(scope.currency??"")&&
  scope.accountId===session.activeAccountId&&
  scope.principalId===session.principalId&&
  scope.active===true&&scope.verifiedPersonalOwner===true&&
  scope.activeWalletBinding===true&&scope.rlsVerified===true;
}
export function createPay54AuthenticatedAccountingBridge({
 resolveAuthenticatedSession,resolveWalletScope,restrictedReader
}={}){
 if(typeof resolveAuthenticatedSession!=="function"||
    typeof resolveWalletScope!=="function"||
    typeof restrictedReader?.read!=="function")reject();

 return Object.freeze({
  async read({request,requestedAccountId}={}){
   if(!UUID.test(requestedAccountId??""))reject();
   try{
    const credential=extractPay54BearerCredential(request);
    const digest=Buffer.from(digestPay54BearerToken(credential),"hex");
    const first=await resolveAuthenticatedSession(request);
    if(!validSession(first)||first.activeAccountId!==requestedAccountId.toLowerCase())
      reject();
    const beforeScope=await resolveWalletScope(first);
    if(!validScope(beforeScope,first))reject();
    const result=await restrictedReader.read({
      request,
      requestedAccountId:first.activeAccountId,
      requestedWalletId:beforeScope.walletId,
      currency:beforeScope.currency,
      expectedTokenDigest:digest,
      expectedSessionId:first.sessionId,
      expectedSessionVersion:first.version
      // The restricted reader independently resolves the credential and must
      // match this 256-bit digest and session version before querying.
    });
    if(result?.schema!=="pay54.wallet-restricted-accounting-proof.v1"||
       result.accountId!==first.activeAccountId||
       result.walletId!==beforeScope.walletId||
       result.currency!==beforeScope.currency||
       result.authorisedForCustomerDisplay!==false||
       result.financialExecutionEnabled!==false||
       result.productionReady!==false)reject();

    // A separate read after SQL completion detects revoked/rotated sessions
    // and account context changes. It is not an atomic serialisation proof.
    const second=await resolveAuthenticatedSession(request);
    if(!validSession(second)||!equalSession(first,second))reject();
    const afterScope=await resolveWalletScope(second);
    if(!validScope(afterScope,second)||
       afterScope.walletId!==beforeScope.walletId||
       afterScope.currency!==beforeScope.currency)reject();
    // Bind credential digest locally without exposing it in result/diagnostics.
    if(digest.length!==32)reject();
    return Object.freeze({
      schema:"pay54.authenticated-accounting-evidence.v1",
      accountId:first.activeAccountId,
      walletId:beforeScope.walletId,
      sessionVersion:first.version,
      currency:beforeScope.currency,
      postedMinor:result.postedMinor,
      heldMinor:result.heldMinor,
      computedUnreservedMinor:result.computedUnreservedMinor,
      sessionRechecked:true,
      customerAvailableBalanceVerified:false,
      authorisedForCustomerDisplay:false,
      stagingDeploymentAuthorised:false,
      productionReady:false,
      financialExecutionEnabled:false
    });
   }catch{reject();}
  }
 });
}
