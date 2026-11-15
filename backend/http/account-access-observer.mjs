"use strict";

/* PAY54 Batch 05 — unmounted account-access audit decorator.
 * Buffers the small account response until a trusted audit sink acknowledges
 * the decision. The wrapper has no listener, credentials or payment authority.
 */
const mapStatus = status => {
  if(status===200)return {outcome:"ALLOWED",reason:"POLICY_OK"};
  if(status===401)return {outcome:"DENIED",reason:"NO_SESSION"};
  if(status===403 || status===404)return {outcome:"DENIED",reason:"POLICY_DENIED"};
  if(status===400 || status===405)return {outcome:"DENIED",reason:"BAD_REQUEST"};
  return {outcome:"ERROR",reason:"UNAVAILABLE"};
};

export function createAuditedAccountHandler({handler,audit}) {
  if(typeof handler!=="function"||!audit||typeof audit.record!=="function"){
    throw new TypeError("Trusted account handler and security audit required");
  }
  return async (request,response) => {
    if(!response || typeof response.writeHead!=="function"||typeof response.end!=="function"){
      throw new TypeError("HTTP response required");
    }
    const capture={headersSent:false,destroyed:false,status:null,headers:null,body:null};
    const proxy={
      get headersSent(){return capture.headersSent;},
      get destroyed(){return capture.destroyed;},
      writeHead(status,headers){
        if(capture.headersSent||!Number.isInteger(status))throw new Error("ACCOUNT_RESPONSE_INVALID");
        capture.status=status;capture.headers=Object.freeze({...headers});
        capture.headersSent=true;return proxy;
      },
      end(body){
        if(!capture.headersSent||capture.body!==null)throw new Error("ACCOUNT_RESPONSE_INVALID");
        if(typeof body!=="string"||Buffer.byteLength(body,"utf8")>16384){
          throw new Error("ACCOUNT_RESPONSE_INVALID");
        }
        capture.body=body;
      }
    };
    let handled;
    try{
      handled=await handler(request,proxy);
      if(handled===false && !capture.headersSent)return false;
      if(handled!==true||!capture.headersSent||capture.body===null){
        throw new Error("ACCOUNT_RESPONSE_INVALID");
      }
      const operation=request?.url?.startsWith("/api/v1/account-contexts/")
        ? "ACCOUNT_SELECT" : "ACCOUNT_LIST";
      await audit.record({operation,...mapStatus(capture.status)});
    }catch(error){
      // No buffered customer data escapes if the audit sink is unavailable.
      throw error;
    }
    response.writeHead(capture.status,capture.headers);
    response.end(capture.body);
    return true;
  };
}
