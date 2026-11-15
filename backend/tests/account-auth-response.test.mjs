"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {projectAuthenticatedAccountResponse} from "../http/account-auth-response.mjs";
const P="11111111-1111-4111-8111-111111111111";
const A="22222222-2222-4222-8222-222222222222";
test("account response includes only public display fields",()=>{
 const value=projectAuthenticatedAccountResponse({verifiedPrincipalId:P,
 accounts:[{accountId:A,type:"BUSINESS",displayName:"Business",legalOwnerId:P,balance:999999}]});
 assert.deepEqual(value.accounts,[{accountId:A,type:"BUSINESS",displayName:"Business"}]);
 assert.equal(JSON.stringify(value).includes(P),false);
 assert.equal(value.financialExecutionEnabled,false);
});
test("missing identity, duplicate or oversized responses are rejected",()=>{
 for(const accounts of [[{accountId:A,type:"PERSONAL",displayName:"A"},{accountId:A,type:"PERSONAL",displayName:"A"}],
  [{accountId:"bad",type:"PERSONAL",displayName:"A"}],
  Array.from({length:101},()=>({accountId:A,type:"PERSONAL",displayName:"A"}))]){
  assert.throws(()=>projectAuthenticatedAccountResponse({verifiedPrincipalId:P,accounts}),/ACCOUNT_RESPONSE_DENIED/);
 }
 assert.throws(()=>projectAuthenticatedAccountResponse({verifiedPrincipalId:"unverified",accounts:[]}),/ACCOUNT_RESPONSE_DENIED/);
});
