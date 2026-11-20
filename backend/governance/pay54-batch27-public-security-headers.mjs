"use strict";
/** Batch27/1130 — inspect observed HTTP security headers, no website request. */
const deny=()=>{throw Error("PAY54_PUBLIC_SECURITY_HEADERS_DENIED");};
export function inspectPay54PublicSecurityHeaders({headers}={}){
 if(!headers||typeof headers!=="object"||Array.isArray(headers))deny();
 const keys=Object.keys(headers);
 if(keys.length>100||keys.some(k=>!/^[-a-z0-9]{1,60}$/.test(k)||
    typeof headers[k]!=="string"||headers[k].length>2048))deny();
 const normalized=Object.fromEntries(keys.map(k=>[k.toLowerCase(),headers[k]]));
 const csp=normalized["content-security-policy"]??"";
 const hsts=normalized["strict-transport-security"]??"";
 const frame=normalized["x-frame-options"]??"";
 const cspSafe=/\bdefault-src\s+'self'(?:\s|;|$)/.test(csp) &&
    !/\bunsafe-inline\b|\bunsafe-eval\b|\*/.test(csp);
 const hstsSafe=/max-age=([0-9]+)/i.test(hsts) &&
    Number(hsts.match(/max-age=([0-9]+)/i)?.[1])>=15552000;
 return Object.freeze({
  schema:"pay54.public-http-header-review.v1",
  strictCspClaimed:cspSafe,
  hstsHalfYearOrMoreClaimed:Boolean(hstsSafe),
  clickjackingProtectionClaimed:
   /^(?:DENY|SAMEORIGIN)$/i.test(frame)||
   /\bframe-ancestors\b/.test(csp),
  actualBrowserHeadersIndependentlyObserved:false,
  tlsAndCookiesIndependentlyChecked:false,
  productionReleaseAuthorised:false
 });
}
