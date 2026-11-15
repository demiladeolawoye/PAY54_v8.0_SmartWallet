"use strict";

/* PAY54 Batch 05 — canonical parameter-bound account SQL policy.
 * No duplicate SQL definitions and no unreviewed dynamic statement access.
 */
import { identifyAccountQuery } from "./account-query-catalogue.mjs";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const valid=value=>typeof value==="string"&&UUID.test(value);

export function assertAccountReadStatement(sql,params,principalId) {
  if(!valid(principalId)||!Array.isArray(params)||params.length>2 ||
     params.some(value=>!valid(value))){
    throw new Error("UNAPPROVED_ACCOUNT_QUERY");
  }
  const id=identifyAccountQuery(sql);
  const principal=principalId.toLowerCase();
  if(id==="ACCOUNT_LIST" && params.length===1 &&
     params[0].toLowerCase()===principal)return true;
  if(id==="ACCOUNT_SELECT" && params.length===2 &&
     params[0].toLowerCase()===principal)return true;
  if(id==="PERSONAL_WALLET_IDS" && params.length===2 &&
     params[1].toLowerCase()===principal)return true;
  throw new Error("UNAPPROVED_ACCOUNT_QUERY");
}
