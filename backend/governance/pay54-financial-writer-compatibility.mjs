"use strict";
/**
 * Source-only and fail-closed writer implementation contract.
 * Never use this validator to authorise a migration or real-money activity.
 */
export const FINANCIAL_FUNCTIONS=Object.freeze([
 "reserve_wallet_transfer","capture_reserved_wallet_transfer",
 "release_reserved_wallet_transfer"
]);
export const FINANCIAL_RELATIONS=Object.freeze([
 "wallets","ledger_accounts","ledger_entries",
 "ledger_journals","balance_reservations"
]);
export function examineFinancialWriterCompatibility({reserveSql,captureReleaseSql,forwardSql}={}){
 if([reserveSql,captureReleaseSql,forwardSql].some(x=>typeof x!=="string"))
  throw new TypeError("PAY54_B46_SOURCE_REQUIRED");
 const sources=reserveSql+"\n"+captureReleaseSql;
 const findings=[];
 for(const functionName of FINANCIAL_FUNCTIONS){
  // Read only the declaration preceding this function's first AS $$ delimiter.
  // Never allow SECURITY INVOKER from another function to satisfy this check.
  const declarationPattern=new RegExp(
   "CREATE\\s+(?:OR\\s+REPLACE\\s+)?FUNCTION\\s+pay54\\."+
   functionName+
   "\\s*\\(([\\s\\S]*?)\\bAS\\s+\\$\\$","i"
  );
  const declaration=declarationPattern.exec(sources);
  if(!declaration ||
   !/\\bLANGUAGE\\s+plpgsql\\s+SECURITY\\s+INVOKER\\b/i.test(declaration[0])
  ) findings.push("INVOKER_FUNCTION_NOT_PROVEN:"+functionName);
 }
 for(const relation of FINANCIAL_RELATIONS){
  const force=new RegExp("ALTER\\s+TABLE\\s+pay54\\."+relation+"\\s+FORCE\\s+ROW\\s+LEVEL\\s+SECURITY\\s*;","i");
  if(!force.test(forwardSql))findings.push("FORCE_RLS_NOT_EVIDENCED:"+relation);
 }
 findings.push("EFFECTIVE_NON_SUPERUSER_WRITER_SUCCESS_NOT_PROVEN");
 findings.push("FINANCIAL_WRITER_POLICY_AND_LOCKING_REVIEW_REQUIRED");
 findings.push("SESSION_BOUND_PAYMENT_IDENTITY_NOT_PROVEN");
 findings.push("DBA_SECURITY_APPROVAL_MISSING");
 return Object.freeze({
  schema:"pay54.financial-writer-compatibility-contract.v1",
  status:"NO_GO",
  functions:Object.freeze([...FINANCIAL_FUNCTIONS]),
  financialRelations:Object.freeze([...FINANCIAL_RELATIONS]),
  findings:Object.freeze(findings),
  cloudExecution:false,
  managedStagingAuthorized:false,
  financialExecutionAuthorized:false,
  productionAuthorized:false
 });
}
