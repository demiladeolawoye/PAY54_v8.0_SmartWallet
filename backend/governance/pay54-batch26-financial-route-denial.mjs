"use strict";
/** Batch26/1043 — retained HTTP 503 boundary source inspection. */
import {readFileSync} from "node:fs";
const deny=()=>{throw Error("PAY54_FINANCIAL_ROUTE_DENIAL_DRIFT");};
export function inspectPay54FinancialRouteDenial({
 source=readFileSync(new URL("../src/server.mjs",import.meta.url),"utf8")
}={}){
 if(typeof source!=="string"||source.length<500 ||
    !source.includes("FINANCIAL_EXECUTION_UNAVAILABLE") ||
    !source.includes("ACCOUNT_CONTEXT_SERVICE_UNAVAILABLE") ||
    !source.includes("503"))deny();
 return Object.freeze({
  schema:"pay54.financial-route-denial-source-v1",
  accountServiceUnavailableSourcePresent:true,
  financialExecutionUnavailableSourcePresent:true,
  runtimeRouteProofRequiresLoopback:true,
  realMoneyEnabled:false,
  releaseAuthorised:false
 });
}
