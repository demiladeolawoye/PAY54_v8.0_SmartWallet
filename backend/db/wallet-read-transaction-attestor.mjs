"use strict";

/**
 * PAY54 Batch 34 — read-only connection attestation, source only.
 * This module cannot query customer balances or grant role access.
 * A verified database connection is injected by a future approved adapter.
 */
const DENIED="PAY54_WALLET_READ_TRANSACTION_DENIED";
const fail=()=>{throw new Error(DENIED);};
const EXPECTED="pay54_wallet_read_caller_role";

export function createPay54WalletReadTransactionAttestor({checkout}={}){
 if(typeof checkout!=="function")fail();
 return Object.freeze({
  async inspect(){
   let client,started=false;
   try{
    client=await checkout();
    if(!client||typeof client.query!=="function"||
        typeof client.release!=="function")fail();
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    started=true;
    const proof=await client.query(
      "SELECT current_user AS role_name, session_user AS login_name, current_setting('transaction_read_only') AS read_only, current_setting('transaction_isolation') AS isolation"
    );
    const p=proof?.rows;
    if(!Array.isArray(p)||p.length!==1||
       p[0].role_name!==EXPECTED||
       typeof p[0].login_name!=="string"||
       p[0].login_name===EXPECTED||
       p[0].read_only!=="on"||
       p[0].isolation!=="repeatable read")fail();
    const privileges=await client.query(
      "SELECT has_table_privilege(current_user,'pay54.ledger_entries','SELECT') AS ledger_read, has_table_privilege(current_user,'pay54.balance_reservations','SELECT') AS reservation_read, has_function_privilege(current_user,'pay54.wallet_read_authority_status()','EXECUTE') AS callable"
    );
    if(!Array.isArray(privileges?.rows)||privileges.rows.length!==1||
      privileges.rows[0].ledger_read!==false||
      privileges.rows[0].reservation_read!==false||
      privileges.rows[0].callable!==false)fail();
    return Object.freeze({
      schema:"pay54.wallet-read-transaction-attestation.v1",
      inertAuthorityConfirmed:true,
      financialDataReadPermitted:false,
      operationalTlsVerified:false,
      realProviderIdentityVerified:false,
      credentialCustodyVerified:false,
      authorisedForCustomerDisplay:false,
      stagingAuthorised:false,
      productionAuthorised:false
    });
   }catch{fail();}
   finally{
    if(client){
      if(started){
       try{await client.query("ROLLBACK");}catch{/* discard below */}
      }
      try{client.release(true);}catch{/* discard attempted */}
    }
   }
  }
 });
}
