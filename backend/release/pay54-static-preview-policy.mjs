"use strict";

/**
 * PAY54 Batch 28 / 1199 — strict, isolated marketing-only HTML/CSS contract.
 *
 * This intentionally supports only the two checked-in static preview files.
 * The regular expression checks are conservative negative filters, not a
 * general-purpose HTML parser or source of trust for other websites.
 */
const deny=()=>{throw Error("PAY54_NONFINANCIAL_PREVIEW_POLICY_DENIED");};
const EXTERNAL=/\b(?:https?:)?\/\//i;
const UNSAFE_MARKUP=/<(?:script|iframe|form|input|button|video|audio|object|embed|portal|base|svg|canvas|link\s+[^>]*rel\s*=\s*["'](?:preload|modulepreload)|meta\s+[^>]*http-equiv\s*=\s*["']refresh)\b|\bon(?:click|load|error|submit|focus|mouseover)\s*=/i;
const FILE_REFERENCES=/\b(?:href|src|action|poster)\s*=\s*(["'])([^"']+)\1/gi;
const HREFS=new Set(["#main-content","assets/css/preview.css"]);
export function verifyPay54NonfinancialPreviewSource({
 html,css
}={}){
 if(typeof html!=="string"||typeof css!=="string"||
    html.length<500||html.length>128*1024||
    css.length<500||css.length>128*1024||
    !html.startsWith("<!doctype html>")||
    !html.includes("Product preview — not live banking")||
    !html.includes("No funds or personal financial information")||
    !html.includes("Content-Security-Policy")||
    !html.includes("default-src 'none'")||
    !html.includes("style-src 'self'")||
    UNSAFE_MARKUP.test(html) ||
    EXTERNAL.test(html)||EXTERNAL.test(css)||
    /javascript:|data:|blob:|@import|url\s*\(|expression\s*\(|sourceMappingURL|PAY54Session|linked-card-development/i.test(html+"\n"+css)
 )deny();
 const matches=[...html.matchAll(FILE_REFERENCES)];
 if(matches.length!==2 ||
    matches.some(x=>!HREFS.has(x[2])) ||
    new Set(matches.map(x=>x[2])).size!==2 ||
    !/<html\s+lang="en">/.test(html) ||
    !/<main\s+id="main-content">/.test(html) ||
    !/<a\s+class="skip"\s+href="#main-content">/.test(html) ||
    !/prefers-reduced-motion/.test(css) ||
    !/prefers-contrast/.test(css))deny();
 return Object.freeze({
  schema:"pay54.nonfinancial-preview-source-policy.v1",
  htmlAndStylesheetStructurallyLimited:true,
  linkedResourceCount:2,
  scriptsAndFormsForbidden:true,
  customerTransactionsAvailable:false,
  actualPublicSiteVerified:false,
  deploymentAuthorised:false
 });
}
