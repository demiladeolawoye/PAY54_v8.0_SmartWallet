"use strict";
/** Batch27/1122 — redact sensitive public audit path names into categories. */
const deny=()=>{throw Error("PAY54_PUBLIC_PATH_REPORT_DENIED");};
const TYPES=Object.freeze(["BACKEND_SOURCE","INTERNAL_DOC","INFRASTRUCTURE",
 "WORKFLOW","STATIC_ASSET","UNKNOWN"]);
export function classifyPay54PublicAuditPath({path}={}){
 if(typeof path!=="string"||!path||path.length>512||
    path.startsWith("/")||path.includes("..")||path.includes("\0"))deny();
 let type="UNKNOWN";
 if(path.startsWith("backend/"))type="BACKEND_SOURCE";
 else if(path.startsWith("docs/"))type="INTERNAL_DOC";
 else if(path.startsWith("infrastructure/"))type="INFRASTRUCTURE";
 else if(path.startsWith(".github/"))type="WORKFLOW";
 else if(path.startsWith("assets/")||path==="index.html"||
    path==="dashboard.html")type="STATIC_ASSET";
 return Object.freeze({
  schema:"pay54.public-audit-path-category.v1",
  category:type,
  sensitiveSourceCategory:type!=="STATIC_ASSET"&&type!=="UNKNOWN",
  pathNotIncludedInRedactedReport:true,
  actualUrlProbed:false,releaseAuthorised:false
 });
}
