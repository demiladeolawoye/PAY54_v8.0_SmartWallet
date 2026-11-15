"use strict";

/* PAY54 Batch 05 — offline account source security assertions.
 * Source policy is defense in depth, not runtime verification.
 */
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const ROOT=new URL("../../",import.meta.url);
const read=path=>readFileSync(new URL(path,ROOT),"utf8");

export function assessAccountSourceSecurity(sources){
  if(!sources||typeof sources!=="object")throw new TypeError("PAY54 account source inventory required");
  const get=name=>{
    if(typeof sources[name]!=="string")throw new TypeError("Missing "+name);
    return sources[name];
  };
  const catalogue=get("catalogue"), context=get("context"), wallet=get("wallet"),
    policy=get("policy"),migration=get("migration"),handler=get("handler");
  const findings=[
    ["CATALOGUE_REFERENCED_CONTEXT",/buildAccountQuery\("ACCOUNT_LIST"/.test(context)&&
      /buildAccountQuery\("ACCOUNT_SELECT"/.test(context)],
    ["CATALOGUE_REFERENCED_WALLET",/buildAccountQuery\("PERSONAL_WALLET_IDS"/.test(wallet)],
    ["NO_INLINE_READER_SQL",!/FROM pay54\./.test(context)&&!/FROM pay54\./.test(wallet)],
    ["POLICY_IMPORTS_CATALOGUE",/identifyAccountQuery/.test(policy)&&
      /account-query-catalogue\.mjs/.test(policy)],
    ["BOUND_SQL",/m\.principal_subject = \$1::uuid/.test(catalogue)&&
      /m\.principal_subject=\$2::uuid/.test(catalogue)],
    ["READ_ONLY_QUERY",!/INSERT INTO|DELETE FROM|UPDATE pay54|DROP TABLE/i.test(catalogue)],
    ["ZERO_DATA_READER_GRANT",/CREATE ROLE pay54_account_reader_role/.test(migration)&&
      /NOLOGIN/.test(migration)&&/NOBYPASSRLS/.test(migration)&&
      !/GRANT SELECT/i.test(migration)],
    ["NO_PUBLIC_ACCOUNT_ROUTE",!/\.listen\(|createServer\(|allUsers|allAuthenticatedUsers/.test(handler)]
  ].map(([id,passed])=>Object.freeze({id,passed:Boolean(passed)}));
  return Object.freeze({passed:findings.every(x=>x.passed),findings:Object.freeze(findings),
    sourceOnly:true,cloudProvisioning:"DISABLED",financialExecution:"DISABLED",
    stagingRelease:"BLOCKED",securityAttestation:"NOT_VERIFIED"});
}

export function loadAccountSourceInventory(){
  return Object.freeze({
    catalogue:read("backend/db/account-query-catalogue.mjs"),
    context:read("backend/domain/account-context-reader.mjs"),
    wallet:read("backend/domain/account-wallet-reader.mjs"),
    policy:read("backend/db/account-sql-policy.mjs"),
    migration:read("backend/db/migrations/012_account_read_role_baseline.sql"),
    handler:read("backend/http/account-context-handler.mjs")
  });
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const report=assessAccountSourceSecurity(loadAccountSourceInventory());
  process.stdout.write(JSON.stringify(report,null,2)+"\n");
  if(!report.passed)process.exitCode=1;
}
