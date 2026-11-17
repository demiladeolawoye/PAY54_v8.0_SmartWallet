"use strict";
/**
 * Batch27/1120 — read-only tracked filename history audit.
 * Never returns or reads private source bytes. History path inventory is a
 * potential exposure signal; it is not proof of Pages publication.
 */
import {execFileSync} from "node:child_process";
import {resolve} from "node:path";
const SENSITIVE=/^(?:backend|infrastructure|docs|\.github)\/|(?:^|\/)(?:\.env(?:\.|$)|[^/]+\.(?:pem|key|sql|p12|sqlite|db))$/i;
const deny=()=>{throw Error("PAY54_GIT_HISTORY_EXPOSURE_AUDIT_DENIED");};
export function inspectPay54GitHistoryPaths({paths}={}){
 if(!Array.isArray(paths)||paths.length>100000)deny();
 const seen=new Set(),suspect=[];
 for(const path of paths){
  if(typeof path!=="string"||path.length>512||
     !path||path.includes("\0")||path.startsWith("/")||
     path.split("/").some(x=>!x||x==="."||x===".."))deny();
  if(seen.has(path))continue;
  seen.add(path);
  if(SENSITIVE.test(path))suspect.push(path);
 }
 suspect.sort();
 return Object.freeze({
  schema:"pay54.git-history-sensitive-path-inventory.v1",
  historicFilePathCount:seen.size,
  sensitiveHistoricPathCount:suspect.length,
  exampleSensitivePaths:Object.freeze(suspect.slice(0,30)),
  historicalGitObjectsReviewed:false,
  gitPagesHistoryProvenPublic:false,
  exposedSecretsConfirmed:false,
  publicationIncidentClosed:false
 });
}
export function inspectPay54LocalGitHistory({
 cwd=resolve(import.meta.dirname,"../..")
}={}){
 if(typeof cwd!=="string")deny();
 let result;
 try{
  result=execFileSync("git",["log","--all",
   "--pretty=format:","--name-only","--no-renames"],{
    cwd,encoding:"utf8",timeout:15000,maxBuffer:16*1024*1024,
    stdio:["ignore","pipe","ignore"]
   });
 }catch{deny();}
 const paths=result.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 return inspectPay54GitHistoryPaths({paths});
}
