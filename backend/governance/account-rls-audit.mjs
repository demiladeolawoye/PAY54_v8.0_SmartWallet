"use strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
/* Offline source invariants only; never a live PostgreSQL attestation. */
const REQUIRED=[
 "pay54_reader_account_deny",
 "pay54_reader_membership_deny",
 "pay54_reader_wallet_binding_deny"
];
export function auditAccountRlsSource(source){
 if(typeof source!=="string"||source.length>20000)throw new TypeError("RLS_SOURCE_INVALID");
 const problems=[];
 for(const policy of REQUIRED){
   const pattern=new RegExp("CREATE POLICY\\s+"+policy+
   "\\s+ON\\s+pay54\\.[a-z_]+\\s+AS RESTRICTIVE FOR SELECT TO pay54_account_reader_role USING \\(false\\)","i");
   if(!pattern.test(source))problems.push("POLICY_INVALID_"+policy);
 }
 if(/\bGRANT\s+(?:SELECT|ALL|INSERT|UPDATE|DELETE|EXECUTE)\b/i.test(source)){
   problems.push("UNAPPROVED_GRANT");
 }
 if(/current_setting\s*\(|CREATE\s+ROLE\s+|BYPASSRLS|SECURITY\s+DEFINER/i.test(source)){
   problems.push("UNTRUSTED_RLS_AUTHORITY");
 }
 if(!/COMMIT;/.test(source))problems.push("MISSING_TRANSACTION_COMMIT");
 return Object.freeze({passed:problems.length===0,issues:Object.freeze(problems),
  runtimeVerified:false,liveDeploymentAuthorised:false});
}
export function readAccountRlsSource(){
 const file=new URL("../../backend/db/migrations/013_account_rls_denial.sql",import.meta.url);
 return readFileSync(file,"utf8");
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const result=auditAccountRlsSource(readAccountRlsSource());
 process.stdout.write(JSON.stringify(result,null,2)+"\n");
 if(!result.passed)process.exitCode=1;
}
