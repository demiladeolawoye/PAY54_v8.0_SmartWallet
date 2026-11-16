"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
 listNigeriaBoundCorridors,getNigeriaBoundCorridor,assessNigeriaBoundCorridor
} from "../domain/nigeria-bound-corridors.mjs";

test("318: Nigeria-bound global registry includes reviewed sending markets",()=>{
 const list=listNigeriaBoundCorridors();
 assert.equal(list.length,12);
 for(const origin of ["GB","US","DE","FR","NL","ES","IE","CA","AU","SG","AE","JP"]){
  const c=getNigeriaBoundCorridor(origin);
  assert.equal(c.id,origin+"-NG");
  assert.equal(c.destinationCurrency,"NGN");
  assert.equal(c.executionEnabled,false);
  assert.ok(Object.isFrozen(c));
 }
 assert.equal(getNigeriaBoundCorridor("gb").sourceCurrency,"GBP");
});
test("318: every country and provider-capability gate remains closed",()=>{
 for(const corridor of listNigeriaBoundCorridors()){
  const assessment=assessNigeriaBoundCorridor(corridor.origin);
  assert.equal(assessment.candidate,true);
  assert.equal(assessment.available,false);
  assert.equal(assessment.executable,false);
  assert.equal(assessment.livePartnerAuthorised,false);
  assert.ok(assessment.reasons.includes("RELEASE_NOT_AUTHORISED"));
  assert.ok(Object.isFrozen(assessment.reasons));
 }
});
test("318: cannot invent other destination or unknown corridor",()=>{
 for(const [source,target] of [["GB","US"],["IN","NG"],["ZZ","NG"],["GB","GB"],["GB","x"]]){
  assert.equal(getNigeriaBoundCorridor(source,target),null);
  assert.equal(assessNigeriaBoundCorridor(source,target).executable,false);
  assert.equal(assessNigeriaBoundCorridor(source,target).candidate,false);
 }
});
test("318: attempting to mutate registry or spoof readiness cannot activate",()=>{
 const first=listNigeriaBoundCorridors()[0];
 assert.throws(()=>{first.executionEnabled=true;},TypeError);
 const result=assessNigeriaBoundCorridor("US","NG",{providerReady:true});
 assert.equal(result.executable,false);
 assert.equal(result.livePartnerAuthorised,false);
});
