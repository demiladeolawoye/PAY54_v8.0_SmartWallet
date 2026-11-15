"use strict";

/* PAY54 Batch 02 — unmounted, read-only HTTP account context handler.
 * There is no route registration, network listener, database credential,
 * wallet action, financial execution, or cloud deployment in this module. */
import { createAccountContextReader } from "../domain/account-context-reader.mjs";
import { requireTrustedPrincipal } from "../domain/trusted-account-principal.mjs";
import { projectAccountForSwitcher, projectAccountList } from "../domain/account-public-projection.mjs";

const BASE="/api/v1/account-contexts";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEADERS=Object.freeze({
  "Content-Type":"application/json; charset=utf-8",
  "Cache-Control":"no-store, private",
  "X-Content-Type-Options":"nosniff",
  "Referrer-Policy":"no-referrer",
  "Content-Security-Policy":"default-src 'none'; frame-ancestors 'none'"
});

export function createAccountContextHandler({query,principalResolver}) {
  if(typeof query!=="function" || !principalResolver ||
     typeof principalResolver.resolve!=="function"){
    throw new TypeError("Trusted identity resolver and read-only query required");
  }
  const reader=createAccountContextReader({
    query,
    resolveAuthenticatedPrincipal:async request=>
      requireTrustedPrincipal(await principalResolver.resolve(request))
  });
  return async function handleAccountContext(request,response) {
    if(!response || typeof response.writeHead!=="function" ||
      typeof response.end!=="function")throw new TypeError("HTTP response required");
    const reply=(status,data,extra={})=>{
      if(response.headersSent||response.destroyed)return;
      const body=JSON.stringify(data);
      response.writeHead(status,{...HEADERS,...extra,"Content-Length":Buffer.byteLength(body)});
      response.end(body);
    };
    let pathname;
    try {pathname=new URL(request?.url??"", "http://localhost").pathname;}catch{
      reply(400,{error:"bad_request"});return true;
    }
    if(pathname!==BASE && !pathname.startsWith(BASE+"/"))return false;
    if(request.method!=="GET"){
      reply(405,{error:"method_not_allowed"},{Allow:"GET"});return true;
    }
    try{
      if(pathname===BASE){
        reply(200,{accounts:projectAccountList(await reader.listForRequest(request)),
          financialExecution:"disabled"});
        return true;
      }
      const id=pathname.slice(BASE.length+1);
      if(!UUID.test(id)){reply(404,{error:"not_found"});return true;}
      const account=await reader.selectForRequest(request,id);
      reply(200,{account:projectAccountForSwitcher(account),financialExecution:"disabled"});
      return true;
    }catch(error){
      const code=error?.message;
      if(code==="ACCOUNT_AUTH_REQUIRED"){
        reply(401,{error:"authentication_required"});
      }else if(code==="ACCOUNT_NOT_AVAILABLE"||code==="INVALID_ACCOUNT_ID"){
        reply(404,{error:"not_found"});
      }else{
        reply(503,{error:"service_unavailable"});
      }
      return true;
    }
  };
}
