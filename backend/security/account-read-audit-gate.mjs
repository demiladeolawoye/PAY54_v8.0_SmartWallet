"use strict";

/* Read-only disclosure gate: success is never released before an audit sink
 * acknowledges a minimal event. No real durable sink is configured here.
 */
export function createAccountReadAuditGate({read,audit}){
 if(typeof read!=="function"||!audit||typeof audit.publish!=="function"){
  throw new TypeError("ACCOUNT_READ_AUDIT_REQUIRED");
 }
 return Object.freeze({
  async execute(request){
   let result;
   try{
    result=await read(request);
    if(!result||typeof result!=="object"||result.financialExecutionEnabled!==false){
      throw new Error("ACCOUNT_RESULT_INVALID");
    }
   }catch(error){
    const denial=error instanceof Error &&
      /^(ACCOUNT_|DB_|READ_TICKET_)/.test(error.message);
    await audit.publish({operation:"ACCOUNT_SELECT",
      outcome:denial?"DENIED":"ERROR",
      reason:denial?"POLICY_DENIED":"UNAVAILABLE"});
    throw new Error("ACCOUNT_READ_DENIED");
   }
   await audit.publish({operation:"ACCOUNT_SELECT",outcome:"ALLOWED",reason:"POLICY_OK"});
   return result;
  }
 });
}
