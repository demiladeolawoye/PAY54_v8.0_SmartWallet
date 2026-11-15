"use strict";
import {authorizeAccountContext} from "../domain/account-membership.mjs";

/* Read-only authorisation matrix. Capability labels are *not* payment execution
 * grants, and 'approve' must still satisfy financial maker-checker controls.
 */
const OPERATIONS=Object.freeze(["view","manage","initiate","approve"]);
export function evaluateAccountAuthorisationMatrix({principalId,account,membership}){
 const result=Object.freeze(Object.fromEntries(OPERATIONS.map(operation=>
  [operation,authorizeAccountContext({principalId,account,membership,operation})])));
 return Object.freeze({operations:result,
  canDisplayAccount:result.view,
  canPostMoney:false,
  canApproveFinancialOperation:false,
  accountContextAuthorizedForMoney:false});
}
