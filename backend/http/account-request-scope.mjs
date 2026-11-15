"use strict";
import {requireAccountIdentityEnvelope} from "../security/account-identity-envelope.mjs";
import {assertTenantAccountAccess} from "../domain/account-tenant-boundary.mjs";
/* Server-selected account scope for a read preview only, no monetary rights. */
export function assertAccountRequestScope({identity,account,membership}){
 const trusted=requireAccountIdentityEnvelope(identity);
 const verdict=assertTenantAccountAccess({
  principalId:trusted.subjectId,requestedAccountId:trusted.accountId,account,membership});
 if(!verdict.viewEligible)throw new Error("ACCOUNT_NOT_AVAILABLE");
 return Object.freeze({accountId:verdict.accountId,viewEligible:true,
  financialExecutionEnabled:false,transactionAuthorised:false});
}
