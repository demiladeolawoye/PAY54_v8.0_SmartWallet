"use strict";
/* PAY54 Batch 06 — offline signed-auth + RLS defense-in-depth assertions.
 * No credentials, secrets, cloud network or live database are inspected.
 */
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {auditAccountRlsSource} from "./account-rls-audit.mjs";
const root=new URL("../../",import.meta.url);
const file=path=>readFileSync(new URL(path,root),"utf8");
export function assessAccountAuthSecurity({jws,keys,revocation,adapter,rls}){
 if([jws,keys,revocation,adapter,rls].some(x=>typeof x!=="string"||x.length>30000)){
  throw new TypeError("ACCOUNT_AUTH_SOURCE_INVALID");
 }
 const issues=[];
 if(!auditAccountRlsSource(rls).passed)issues.push("RLS_DENIAL_WEAKENED");
 if(!/\bverify\(null,/.test(jws)||!/EdDSA/.test(jws)||!/await\s+revocationGuard\.check\(/.test(jws)||
    !/payload\.iss!==issuer/.test(jws)||!/payload\.aud!==audience/.test(jws)){
   issues.push("SIGNED_AUTH_WEAKENED");
 }
 if(!/createPublicKey/.test(keys)||!/ed25519/.test(keys)||!/RETIRED/.test(keys)){
  issues.push("TRUST_POLICY_WEAKENED");
 }
 if(!/revoked!==false/.test(revocation)||!/REVOCATION_UNAVAILABLE/.test(revocation)){
  issues.push("REVOCATION_FAIL_OPEN");
 }
 if(!/createTrustedAccountPrincipalResolver/.test(adapter)||
    !/return\s+verifier\.verifyCompactJws\(/.test(adapter))issues.push("UNTRUSTED_SESSION_ADAPTER");
 const combined=[jws,keys,revocation,adapter].join("\n");
 if(/\.listen\(|createServer\(|\.apply\(|terraform apply|GRANT SELECT/i.test(combined)){
  issues.push("UNAUTHORISED_ACTIVATION");
 }
 return Object.freeze({passed:issues.length===0,issues:Object.freeze(issues),
  runtimeVerified:false,stagingRelease:"BLOCKED",
  financialExecution:"DISABLED",cloudProvisioning:"DISABLED"});
}
export function loadAccountAuthSources(){
 return Object.freeze({
  jws:file("backend/security/account-jws-verifier.mjs"),
  keys:file("backend/security/account-trust-key-policy.mjs"),
  revocation:file("backend/security/account-session-revocation.mjs"),
  adapter:file("backend/security/account-session-adapter.mjs"),
  rls:file("backend/db/migrations/013_account_rls_denial.sql")
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const result=assessAccountAuthSecurity(loadAccountAuthSources());
 process.stdout.write(JSON.stringify(result,null,2)+"\n");
 if(!result.passed)process.exitCode=1;
}
