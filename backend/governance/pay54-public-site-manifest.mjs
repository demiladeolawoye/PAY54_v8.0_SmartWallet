"use strict";

/*
 * PAY54 Batch 11 item 278: source-only public website artefact manifest policy.
 * This checks a proposed list of repository paths, not the actual contents
 * GitHub Pages serves. Publication requires independent site and settings
 * inspection. No deployment or Github Settings changes occur here.
 */

const SAFE_EXT=/\.(?:html|css|js|mjs|svg|png|jpg|jpeg|webp|gif|ico|json|txt|webmanifest)$/i;
const PATH=/^[a-zA-Z0-9][a-zA-Z0-9_.\/-]{0,239}$/;
const DENY_SEGMENTS=new Set([
 "backend",".github","docs","infrastructure","infra","terraform","security","secrets","private","internal",
 "tests","test","node_modules",".git","credentials","config","keys"
]);
const BROWSER_SECURITY_SCRIPTS=new Set([
 "development-auth-bridge.js","index.js","sanitizer.js",
 "secure-storage.js","session-manager.js","transaction-guard.js",
 "validator.js","xss.js"
]);
const DENY_NAME_PATTERN=/(?:^|[._ -])(?:backup|backups|lastworking|old|archive|archived|temp|temporary|draft|debug)(?:[._ -]|$)/i;
const DENY_EXTENSIONS=/\.(?:bak|old|orig|tmp|log|map|sql|pem|key|zip|7z|tar|gz)$/i;
const DENY_FILES=new Set([
 ".env",".env.local",".env.production",".npmrc","package-lock.json",
 "pnpm-lock.yaml","yarn.lock","dockerfile","readme.md","license"
]);
function pathApproved(path){
 if(typeof path!=="string"||!PATH.test(path)||path.includes("//")||
    path.startsWith("/")||path.endsWith("/")||
    path.split("/").some((x,i,segments)=>x==="."||x===".."||
      (DENY_SEGMENTS.has(x.toLowerCase())&&
       !(i===2&&x==="security"&&segments[0]==="assets"&&
         segments[1]==="js"&&segments.length===4&&
         BROWSER_SECURITY_SCRIPTS.has(segments[3])))||
      DENY_NAME_PATTERN.test(x)))return false;
 const name=path.split("/").at(-1).toLowerCase();
 if(DENY_FILES.has(name)||DENY_NAME_PATTERN.test(name)||
    DENY_EXTENSIONS.test(name)||name.startsWith(".env")||
    name.endsWith(".map")||name.endsWith(".pem")||
    name.endsWith(".key")||name.endsWith(".sql")||
    !SAFE_EXT.test(name))return false;
 return true;
}
export function assessPay54PublicSiteManifest({paths}={}){
 if(!Array.isArray(paths)||paths.length===0||paths.length>2000||
    paths.some(x=>typeof x!=="string")){
  throw new Error("PAY54_PUBLIC_MANIFEST_INVALID");
 }
 const duplicate=paths.length!==new Set(paths).size;
 const disallowed=Object.freeze(paths.filter(x=>!pathApproved(x)).sort());
 return Object.freeze({
  inventoryCount:paths.length,
  duplicatePaths:duplicate,
  disallowedPaths:disallowed,
  sourceManifestStructurallySafe:!duplicate&&disallowed.length===0,
  actualPagesContentInspected:false,
  repositoryPagesSettingsVerified:false,
  secretsScanPerformed:false,
  publicationApproved:false,
  deploymentApproved:false,
  productionRelease:"BLOCKED"
 });
}
