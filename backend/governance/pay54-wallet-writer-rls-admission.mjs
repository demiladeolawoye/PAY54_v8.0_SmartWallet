"use strict";
export const FINANCIAL_RELATIONS=Object.freeze(["wallets","ledger_accounts","ledger_entries","ledger_journals","balance_reservations"]);
export function inspectWalletWriterRlsAdmission({forwardSql,rollbackSql}={}){
 if(typeof forwardSql!=="string"||typeof rollbackSql!=="string")throw new TypeError("PAY54_B43_SQL_SOURCES_REQUIRED");
 const blockers=[];
 const relations=FINANCIAL_RELATIONS.map(table=>{
  const match=(sql,action)=>new RegExp("ALTER\\s+TABLE\\s+pay54\\."+table+"\\s+"+action+"\\s+ROW\\s+LEVEL\\s+SECURITY\\s*;","i").test(sql);
  const forced=match(forwardSql,"FORCE");
  const enabled=match(forwardSql,"ENABLE");
  const rollbackRestored=match(rollbackSql,"NO\\s+FORCE")&&match(rollbackSql,"DISABLE");
  const policies=[...forwardSql.matchAll(new RegExp("CREATE\\s+POLICY\\s+([a-z_][a-z_0-9]*)\\s+ON\\s+pay54\\."+table+"\\s+([\\s\\S]*?);","gi"))].map(m=>({name:m[1],body:m[2]}));
  const missingWritePolicies=["INSERT","UPDATE","DELETE"].filter(command=>!policies.some(p=>new RegExp("\\bFOR\\s+(?:"+command+"|ALL)\\b","i").test(p.body)));
  if(!forced||!enabled)blockers.push("EXPECTED_FORCED_RLS_MISSING:"+table);
  if(!rollbackRestored)blockers.push("ROLLBACK_RLS_NOT_RESTORED:"+table);
  for(const command of missingWritePolicies)blockers.push("WRITER_POLICY_NOT_EVIDENCED:"+table+":"+command);
  return Object.freeze({relation:"pay54."+table,forced,enabled,rollbackRestored,forwardPolicies:Object.freeze(policies.map(p=>p.name)),missingWritePolicies:Object.freeze(missingWritePolicies)});
 });
 if(!/CREATE\s+FUNCTION\s+pay54\.wallet_read_restricted_v1\s*\(/i.test(forwardSql))blockers.push("RESTRICTED_READER_FUNCTION_MISSING");
 if(!/DROP\s+FUNCTION\s+pay54\.wallet_read_restricted_v1\s*\(/i.test(rollbackSql))blockers.push("RESTRICTED_READER_ROLLBACK_MISSING");
 blockers.push("FINANCIAL_WRITER_EFFECTIVE_ROLE_NOT_PROVEN","POST_FORWARD_FINANCIAL_REGRESSION_NOT_PROVEN","DBA_AND_SECURITY_SIGNOFF_MISSING");
 return Object.freeze({schema:"pay54.wallet-writer-rls-admission.v1",status:"NO_GO_PENDING_REAL_DATABASE_EVIDENCE",relations:Object.freeze(relations),blockers:Object.freeze([...new Set(blockers)]),sourceOnly:true,databaseExecuted:false,spendingAuthorized:false,persistentMigrationAuthorized:false,stagingAuthorized:false,productionAuthorized:false});
}
