"use strict";
import {createHash,timingSafeEqual} from "node:crypto";
import {extractPay54BearerCredential,digestPay54BearerToken}
 from "./postgres-session-resolver.mjs";

/**
 * Unmounted security preflight. Never invokes a financial procedure,
 * issues a payment authority, provisions a resource or returns a bearer.
 * A fresh read is not an atomic revocation/money-execution barrier.
 */
const ERROR="PAY54_FINANCIAL_COMMAND_NOT_AUTHORISED";
const deny=()=>{throw new Error(ERROR);};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDKEY=/^[A-Za-z0-9._:-]{16,128}$/;
const MONEY=/^[1-9][0-9]{0,17}$/;
const validId=x=>typeof x==="string"&&UUID.test(x)&&x===x.toLowerCase();
const isRecord=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
function validSession(s){
 return isRecord(s)&&validId(s.sessionId)&&validId(s.principalId)&&
  validId(s.activeAccountId)&&s.status==="ACTIVE"&&
  Number.isSafeInteger(s.version)&&s.version>0;
}
function validScope(scope,s){
 return isRecord(scope)&&scope.principalId===s.principalId&&
  scope.accountId===s.activeAccountId&&validId(scope.sourceAccountId)&&
  validId(scope.sourceWalletId)&&validId(scope.destinationWalletId)&&
  scope.sourceWalletId!==scope.destinationWalletId&&
  /^[A-Z]{3}$/.test(scope.currency)&&scope.active===true&&
  scope.verifiedPersonalOwner===true&&scope.rlsVerified===true;
}
function sameSession(a,b){
 return validSession(b)&&a.sessionId===b.sessionId&&
  a.principalId===b.principalId&&a.activeAccountId===b.activeAccountId&&
  a.version===b.version;
}
function sameScope(a,b,s){
 return validScope(b,s)&&Object.keys(a).every(key=>a[key]===b[key]);
}
export function createPay54FinancialCommandPreflight({
 resolveAuthenticatedSession,resolveFinancialScope,freshSessionFence
}={}){
 if(typeof resolveAuthenticatedSession!=="function"||
    typeof resolveFinancialScope!=="function"||
    typeof freshSessionFence?.verify!=="function")deny();
 return Object.freeze({
  async inspect({request,instruction}={}){
   if(!isRecord(instruction)||
     instruction.kind!=="WALLET_TRANSFER_RESERVATION"||
     !validId(instruction.requestedAccountId)||
     !validId(instruction.sourceAccountId)||
     !validId(instruction.destinationWalletId)||
     !MONEY.test(instruction.amountMinor)||
     BigInt(instruction.amountMinor)>9223372036854775807n||
     !IDKEY.test(instruction.idempotencyKey)||
     typeof instruction.requestDigest!=="string"||
     !/^[a-f0-9]{64}$/.test(instruction.requestDigest))deny();
   try{
    const digest=Buffer.from(digestPay54BearerToken(
      extractPay54BearerCredential(request)),"hex");
    if(digest.length!==32)deny();
    const first=await resolveAuthenticatedSession(request);
    if(!validSession(first)||
       first.activeAccountId!==instruction.requestedAccountId)deny();
    const scope=await resolveFinancialScope(first);
    if(!validScope(scope,first)||
       scope.sourceAccountId!==instruction.sourceAccountId||
       scope.destinationWalletId!==instruction.destinationWalletId)deny();
    // Never mistake user-submitted metadata for authenticated account identity.
    const second=await resolveAuthenticatedSession(request);
    if(!sameSession(first,second))deny();
    const fence=await freshSessionFence.verify({
      request,expected:Object.freeze({
       sessionId:first.sessionId,principalId:first.principalId,
       activeAccountId:first.activeAccountId,version:first.version
      })
    });
    if(fence?.schema!=="pay54.fresh-session-commit-fence.v1"||
       fence.sessionVersion!==first.version||
       fence.freshCommittedRead!==true||
       fence.atomicRevocationBarrierProven!==false||
       fence.productionAuthorised!==false)deny();
    const after=await resolveFinancialScope(second);
    if(!sameScope(scope,after,second))deny();
    const comparison=Buffer.from(digestPay54BearerToken(
      extractPay54BearerCredential(request)),"hex");
    if(comparison.length!==32||!timingSafeEqual(digest,comparison))deny();
    const canonical=JSON.stringify({
     kind:instruction.kind,principalId:first.principalId,
     accountId:first.activeAccountId,
     sourceAccountId:scope.sourceAccountId,
     destinationWalletId:scope.destinationWalletId,
     currency:scope.currency,amountMinor:instruction.amountMinor,
     idempotencyKey:instruction.idempotencyKey,
     requestDigest:instruction.requestDigest,
     sessionId:first.sessionId,sessionVersion:first.version
    });
    return Object.freeze({
     schema:"pay54.financial-command-preflight-evidence.v1",
     instructionFingerprint:createHash("sha256").update(canonical).digest("hex"),
     identityRechecked:true,scopeRechecked:true,
     freshCommittedSessionRechecked:true,
     // No returned account/amount or a usable execution token.
     atomicRevocationBarrierProven:false,
     trustedFinancialExecutorAttached:false,
     paymentInstructionAuthorised:false,
     financialExecutionEnabled:false,
     stagingDeploymentAuthorised:false,
     productionAuthorised:false
    });
   }catch{deny();}
  }
 });
}
