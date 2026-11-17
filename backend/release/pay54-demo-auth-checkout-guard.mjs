"use strict";

/**
 * PAY54 Batch 28 / 1224 — source-level legacy development-auth guard.
 *
 * Detects reintroduction of plaintext demo PIN persistence, false bank-grade
 * security assertions, and accidental removal of nonfinancial disclaimers.
 * It NEVER verifies live authentication, licenses, customer identity or MFA.
 */
import {readFileSync} from "node:fs";
import {resolve} from "node:path";

const PAGES=Object.freeze([
 "login.html","signup.html","forgot-pin.html",
 "create-new-pin.html","verify-otp.html"
]);
const deny=()=>{throw Error("PAY54_DEMO_AUTH_SOURCE_BOUNDARY_DENIED");};

export function verifyPay54DemoAuthSources({auth,htmlPages,entrypoint}={}){
 if(typeof auth!=="string" || auth.length<1000 ||
    !htmlPages || typeof htmlPages!=="object" ||
    Array.isArray(htmlPages)||typeof entrypoint!=="string")deny();
 if(/localStorage\.setItem\s*\(\s*["']pay54_pin["']/.test(auth) ||
    /sessionStorage\.setItem\s*\(\s*["']pay54_pin["']/.test(auth) ||
    !auth.includes("PAY54-DEV-PIN-VERIFIER-V2") ||
    !auth.includes('localStorage.removeItem(PAY54_LEGACY_PIN_KEY)') ||
    !auth.includes("PBKDF2-SHA256") ||
    !auth.includes("This is intentionally NOT an OTP verification"))deny();
 if(/Security\s*&(?:amp;)?\s*Financial compliance active/i.test(entrypoint) ||
    !entrypoint.includes("PAY54 development preview") ||
    !entrypoint.includes("Not verified (demo)"))deny();
 for(const path of PAGES){
  const html=htmlPages[path];
  if(typeof html!=="string" || html.length<250 ||
     !html.includes("Development preview only") ||
     !html.includes("No real identity check") ||
     !html.includes("pay54-preview-notice") ||
     /Bank-grade|PINs are encrypted & secure|Code expires shortly|Recovery instructions sent securely/i.test(html) ||
     !html.includes('lang="en"'))deny();
 }
 return Object.freeze({
  schema:"pay54.demo-auth-source-checkout-v1",
  checkedScreens:PAGES.length+1,
  rawPinStorageStatementFound:false,
  unsupportedBankGradeClaimFound:false,
  demoOnlyDisclosuresPresent:true,
  browserProfileMayStillContainLegacyPIN:true,
  actualRealCustomerAuthenticationVerified:false,
  financialServicesEnabled:false,
  productionReleaseAuthorised:false
 });
}
export function inspectPay54DemoAuthCheckout({
 cwd=resolve(import.meta.dirname,"../..")
}={}){
 if(typeof cwd!=="string")deny();
 let auth,entrypoint,htmlPages;
 try{
  auth=readFileSync(resolve(cwd,"assets/js/auth.js"),"utf8");
  entrypoint=readFileSync(resolve(cwd,"index.html"),"utf8");
  htmlPages=Object.fromEntries(PAGES.map(p=>[
   p,readFileSync(resolve(cwd,p),"utf8")
  ]));
 }catch{deny();}
 return verifyPay54DemoAuthSources({auth,htmlPages,entrypoint});
}
