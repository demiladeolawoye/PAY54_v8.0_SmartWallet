"use strict";

/**
 * PAY54 Batch 27 / 1105 — administrator read-only review CLI.
 * Command: GITHUB_TOKEN=<fine-grained-read-token> node
 *   backend/governance/pay54-batch27-github-review-cli.mjs pages
 *
 * Emits redacted JSON only. No logs of response bodies, token, customer data
 * or private source. An HTTP 401/403 is NOT_VERIFIED, never "no exposure".
 */
import {pathToFileURL} from "node:url";
import {collectPay54GithubReadOnlyEvidence}
 from "./pay54-batch27-github-readonly-collector.mjs";

const ENDPOINTS=new Set([
 "pages","defaultBranchProtection","environments","rulesets"
]);
const deny=()=>{throw new Error("PAY54_GITHUB_REVIEW_CLI_DENIED");};
export async function runPay54GithubReviewCli({
 endpoint,githubToken,
 collect=collectPay54GithubReadOnlyEvidence
}={}){
 if(!ENDPOINTS.has(endpoint) ||
    typeof githubToken!=="string" ||
    typeof collect!=="function")deny();
 try{
  const result=await collect({endpoint,token:githubToken});
  if(result?.schema!=="pay54.github-readonly-observation.v1" ||
     result.endpoint!==endpoint ||
     result.releaseAuthorised!==false)deny();
  return JSON.stringify({
   schema:result.schema,endpoint:result.endpoint,
   httpStatus:result.httpStatus,
   classification:result.classification,
   permissionFailure:result.permissionFailure,
   response:result.response,
   independentVerificationStillRequired:true,
   deploymentAuthorised:false
  });
 }catch{deny();}
}
if(process.argv[1] &&
   import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const result=await runPay54GithubReviewCli({
   endpoint:process.argv[2],
   githubToken:process.env.GITHUB_TOKEN
  });
  process.stdout.write(result+"\n");
 }catch{
  process.stderr.write("PAY54 read-only evidence could not be verified; no changes performed\n");
  process.exitCode=1;
 }
}
