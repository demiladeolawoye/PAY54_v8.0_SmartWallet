"use strict";
/** Batch27/1142 — forbid private paths in reviewable public static manifests. */
const INTERNAL=/^(?:backend|infrastructure|docs|\.github)(?:\/|$)|\.(?:sql|pem|key|map|sqlite|db)$/i;
const deny=()=>{throw Error("PAY54_PAGES_PRIVATE_FILE_DENIAL");};
export function inspectPay54PublicArtifactFileNames({paths}={}){
 if(!Array.isArray(paths)||!paths.length||paths.length>10000)deny();
 const seen=new Set(),blocked=[];
 for(const path of paths){
  if(typeof path!=="string"||path.length>512 ||
     !path||path.startsWith("/")||path.includes("\\")||
     path.split("/").some(x=>!x||x==="."||x==="..") ||
     seen.has(path))deny();
  seen.add(path);
  if(INTERNAL.test(path))blocked.push(path);
 }
 return Object.freeze({
  schema:"pay54.public-artifact-filename-denial.v1",
  inspectedFiles:seen.size,
  blockedFiles:Object.freeze(blocked),
  artifactManifestEligibleForReview:blocked.length===0,
  remotePagesArtifactNotInspected:true,
  productionPublicationAuthorised:false
 });
}
