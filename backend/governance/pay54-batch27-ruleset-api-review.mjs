"use strict";
/** PAY54 Batch 27 / 1150 — inspect effective-repository branch ruleset claims. */
const deny=()=>{throw Error("PAY54_GITHUB_RULESET_REVIEW_DENIED");};
export function inspectPay54GithubRulesets({rulesets}={}){
 if(!Array.isArray(rulesets)||rulesets.length>100)deny();
 const seen=new Set();
 let active=0, protectedCount=0;
 for(const r of rulesets){
  if(!r||!Number.isSafeInteger(r.id)||r.id<=0||seen.has(r.id)||
     !["active","disabled","evaluate"].includes(r.enforcement) ||
     !["branch","tag"].includes(r.target) ||
     typeof r.name!=="string"||r.name.length>128)deny();
  seen.add(r.id);
  if(r.enforcement==="active"){
   active++;
   if(r.target==="branch")protectedCount++;
  }
 }
 return Object.freeze({
  schema:"pay54.github-ruleset-source-review.v1",
  observedRulesetCount:rulesets.length,
  activeRulesetCount:active,activeBranchRulesetCount:protectedCount,
  effectiveBranchRulesetConditionsInspected:false,
  adminBypassAndRepoHierarchyInspected:false,
  emptyListDoesNotProveMissingProtection:true,
  deploymentAuthorised:false
 });
}
