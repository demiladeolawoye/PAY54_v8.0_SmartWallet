"use strict";

/* Fail-closed audited account display-read orchestration. A denied request
 * never reveals account rows. Audit acknowledgement is required before
 * returning any permitted display labels. No live audit sink is created.
 */
const DENIAL=/^(ACCOUNT_|DB_PRINCIPAL_|READ_TICKET_|UNAPPROVED_)/;
export function createAuditedAccountRead({service,audit}){
 if(!service||typeof service.read!=="function"||
    !audit||typeof audit.publish!=="function"){
  throw new TypeError("ACCOUNT_AUDIT_CONFIG_INVALID");
 }
 return Object.freeze({
  async read(ticket){
   let result;
   try{result=await service.read(ticket);}
   catch(error){
    const denied=error instanceof Error && DENIAL.test(error.message);
    await audit.publish({operation:"ACCOUNT_SELECT",
      outcome:denied?"DENIED":"ERROR",reason:denied?"POLICY_DENIED":"UNAVAILABLE"});
    throw new Error("ACCOUNT_READ_DENIED");
   }
   // The only disclosure path follows a successful, awaited audit write.
   await audit.publish({operation:"ACCOUNT_SELECT",outcome:"ALLOWED",reason:"POLICY_OK"});
   return result;
  }
 });
}
