"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {runPay54GithubReviewCli as run}
 from "../governance/pay54-batch27-github-review-cli.mjs";
const token="ghp_"+"x".repeat(40);
test("1106: operator CLI outputs only structural Pages evidence and warning",async()=>{
 const json=await run({endpoint:"pages",githubToken:token,
  collect:async()=>({
   schema:"pay54.github-readonly-observation.v1",endpoint:"pages",
   httpStatus:200,classification:"RESPONSE_OBSERVED",
   permissionFailure:false,
   response:{build_type:"workflow",status:"built"},
   releaseAuthorised:false
  })});
 const value=JSON.parse(json);
 assert.equal(value.endpoint,"pages");
 assert.equal(value.independentVerificationStillRequired,true);
 assert.equal(value.deploymentAuthorised,false);
 assert.equal(json.includes(token),false);
});
test("1106: collector failure and forged release approval do not produce output",async()=>{
 for(const collect of [
  async()=>{throw Error("Bearer "+token);},
  async()=>({schema:"pay54.github-readonly-observation.v1",
   endpoint:"pages",releaseAuthorised:true})
 ])await assert.rejects(run({endpoint:"pages",githubToken:token,collect}),
 /GITHUB_REVIEW_CLI_DENIED/);
 await assert.rejects(run({endpoint:"../../secrets",githubToken:token}),
 /GITHUB_REVIEW_CLI_DENIED/);
});
