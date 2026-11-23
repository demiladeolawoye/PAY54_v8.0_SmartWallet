"use strict";

/**
 * PAY54 Batch 35 - unmounted restricted accounting snapshot adapter.
 * Server-only: trustedAuth must digest a verified bearer session credential
 * and bind account/wallet/currency independently of browser-supplied claims.
 * No API endpoint or production database pool is created here.
 */
const DENIED="PAY54_WALLET_RESTRICTED_READ_UNAVAILABLE";
const fail=()=>{throw Error(DENIED);};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MONEY=/^(0|[1-9][0-9]{0,37})$/;
const SQL=`SELECT account_id::text AS "accountId",
 wallet_id::text AS "walletId", currency,
 posted_minor AS "postedMinor", held_minor AS "heldMinor"
 FROM pay54.wallet_read_restricted_disposable($1::bytea,$2::uuid,$3::uuid,$4::varchar(3))`;

export function createPay54RestrictedWalletAccountingReader({
 pool,trustedAuth
}={}){
 if(typeof pool?.connect!=="function"||
    typeof trustedAuth?.resolve!=="function")fail();
 return Object.freeze({
  async read({request,requestedAccountId,requestedWalletId,currency}={}){
   if(!UUID.test(requestedAccountId??"")||
      !UUID.test(requestedWalletId??"")||
      !/^[A-Z]{3}$/.test(currency??""))fail();
   let client,started=false;
   try{
    // A separately reviewed backend resolver must inspect the live session,
    // not an arbitrary object supplied by a browser or view model.
    const auth=await trustedAuth.resolve(request);
    if(!auth||!Buffer.isBuffer(auth.tokenDigest)||
       auth.tokenDigest.length!==32||
       !UUID.test(auth.accountId??"")||
       !UUID.test(auth.walletId??"")||
       auth.accountId.toLowerCase()!==requestedAccountId.toLowerCase()||
       auth.walletId.toLowerCase()!==requestedWalletId.toLowerCase()||
       auth.currency!==currency||auth.active!==true)fail();
    client=await pool.connect();
    if(typeof client?.query!=="function"||
       typeof client?.release!=="function")fail();
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    started=true;
    const role=await client.query(
      "SELECT current_user AS role, session_user AS login, current_setting('transaction_read_only') AS readonly, current_setting('transaction_isolation') AS isolation"
    );
    if(role?.rows?.length!==1||
       role.rows[0].role!=="pay54_wallet_read_caller_role"||
       role.rows[0].login==="pay54_wallet_read_owner_role"||
       role.rows[0].readonly!=="on"||
       role.rows[0].isolation!=="repeatable read")fail();
    const q=await client.query(SQL,[
      auth.tokenDigest,requestedAccountId.toLowerCase(),
      requestedWalletId.toLowerCase(),currency
    ]);
    if(q?.rows?.length!==1)fail();
    const row=q.rows[0];
    if(row.accountId!==requestedAccountId.toLowerCase()||
       row.walletId!==requestedWalletId.toLowerCase()||
       row.currency!==currency||
       typeof row.postedMinor!=="string"||!MONEY.test(row.postedMinor)||
       typeof row.heldMinor!=="string"||!MONEY.test(row.heldMinor)||
       BigInt(row.heldMinor)>BigInt(row.postedMinor))fail();
    return Object.freeze({
      schema:"pay54.wallet-restricted-accounting-proof.v1",
      accountId:row.accountId,walletId:row.walletId,currency,
      postedMinor:row.postedMinor,heldMinor:row.heldMinor,
      computedUnreservedMinor:(
        BigInt(row.postedMinor)-BigInt(row.heldMinor)).toString(),
      authorisedForCustomerDisplay:false,
      financialExecutionEnabled:false,
      productionReady:false,
      providerSettlementVerified:false
    });
   }catch{fail();}
   finally{
    if(client){
      if(started){try{await client.query("ROLLBACK");}catch{/* discard */}}
      try{client.release(true);}catch{/* discard attempted */}
    }
   }
  }
 });
}
